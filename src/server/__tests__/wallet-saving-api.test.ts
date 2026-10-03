// @vitest-environment node
/** PATCH /api/v1/wallets/[id]/saving → src/app/api/v1/wallets/[id]/saving/route.ts */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import Wallet from '@/server/db/models/Wallet';
import { signToken } from '@/server/shared/auth/crypto';
import { WalletRepository } from '@/server/modules/wallets/repositories/WalletRepository';

vi.mock('server-only', () => ({}));
vi.mock('@/server/db/index', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  default: vi.fn().mockResolvedValue(undefined),
}));

let PATCH: typeof import('@/app/api/v1/wallets/[id]/saving/route').PATCH;
const USER = new mongoose.Types.ObjectId();
const OTHER = new mongoose.Types.ObjectId();
const TOKEN = signToken({ userId: USER.toString() });
const repo = new WalletRepository();
let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri());
  await Wallet.init();
  PATCH = (await import('@/app/api/v1/wallets/[id]/saving/route')).PATCH;
}, 60_000);
afterAll(async () => { await mongoose.disconnect(); await replSet?.stop(); }, 60_000);
beforeEach(async () => { await Wallet.deleteMany({}); });

const seed = (overrides: Record<string, unknown> = {}) => Wallet.create({ userId: USER, name: 'Main', balance: 1234.5, ...overrides });
function call(id: string, body?: unknown, { token = TOKEN, raw }: { token?: string; raw?: string } = {}) {
  const request = new NextRequest(new URL(`/api/v1/wallets/${id}/saving`, 'http://localhost:3000'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  return PATCH(request, { params: Promise.resolve({ id }) });
}

describe('PATCH /api/v1/wallets/{id}/saving', () => {
  it('turns saving on with goal 10000, visible through repository reads', async () => {
    const wallet = await seed();
    const res = await call(String(wallet._id), { isSaving: true, goalAmount: 10000 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe(true);
    expect(json.data).toMatchObject({ id: String(wallet._id), isSaving: true, goalAmount: 10000, balance: 1234.5 });
    expect(json.data.userId).toBeUndefined();
    const owned = await repo.findOwned(String(wallet._id), USER.toString());
    expect(owned).toMatchObject({ isSaving: true, goalAmount: 10000 });
    expect((await repo.list(USER.toString())).find(w => w.id === String(wallet._id))).toMatchObject({ isSaving: true, goalAmount: 10000 });
  });

  it('turns saving off and clears the goal', async () => {
    const wallet = await seed({ isSaving: true, goalAmount: 500 });
    const res = await call(String(wallet._id), { isSaving: false });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.isSaving).toBe(false);
    expect(json.data.goalAmount).toBeUndefined();
    const stored = await Wallet.findById(wallet._id).lean();
    expect(stored!.isSaving).toBe(false);
    expect(stored!.goalAmount).toBeUndefined();
  });

  it('clears the goal even if one is sent while turning saving off', async () => {
    const wallet = await seed({ isSaving: true, goalAmount: 500 });
    await call(String(wallet._id), { isSaving: false, goalAmount: 99 });
    expect((await Wallet.findById(wallet._id).lean())!.goalAmount).toBeUndefined();
  });

  it('never changes the balance', async () => {
    const wallet = await seed();
    await call(String(wallet._id), { isSaving: true, goalAmount: 1, balance: 0 });
    await call(String(wallet._id), { isSaving: false });
    expect((await Wallet.findById(wallet._id))!.balance).toBe(1234.5);
  });

  it('allows several saving wallets at once', async () => {
    const a = await seed({ name: 'A' });
    const b = await seed({ name: 'B' });
    expect((await call(String(a._id), { isSaving: true, goalAmount: 1 })).status).toBe(200);
    expect((await call(String(b._id), { isSaving: true, goalAmount: 2 })).status).toBe(200);
    expect(await Wallet.countDocuments({ isSaving: true })).toBe(2);
  });

  it.each([
    ['missing goal', { isSaving: true }],
    ['zero goal', { isSaving: true, goalAmount: 0 }],
    ['negative goal', { isSaving: true, goalAmount: -5 }],
    ['non-number goal', { isSaving: true, goalAmount: '100' }],
    ['missing isSaving', { goalAmount: 100 }],
    ['non-boolean isSaving', { isSaving: 'yes', goalAmount: 100 }],
  ])('returns 400 for %s and leaves wallet untouched', async (_name, body) => {
    const wallet = await seed();
    const res = await call(String(wallet._id), body);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect((await Wallet.findById(wallet._id).lean())!.isSaving).toBe(false);
  });

  it('returns 400 for malformed JSON and invalid id', async () => {
    const wallet = await seed();
    expect((await call(String(wallet._id), undefined, { raw: '{bad' })).status).toBe(400);
    expect((await call('not-an-id', { isSaving: false })).status).toBe(400);
  });

  it("returns 404 for another user's wallet and does not modify it", async () => {
    const theirs = await Wallet.create({ userId: OTHER, name: 'Theirs' });
    const res = await call(String(theirs._id), { isSaving: true, goalAmount: 10000 });
    expect(res.status).toBe(404);
    expect((await Wallet.findById(theirs._id).lean())!.isSaving).toBe(false);
  });

  it('returns 404 for unknown wallet id', async () => {
    expect((await call(String(new mongoose.Types.ObjectId()), { isSaving: false })).status).toBe(404);
  });

  it('returns 401 without credentials', async () => {
    const wallet = await seed();
    const request = new NextRequest(new URL(`/api/v1/wallets/${wallet._id}/saving`, 'http://localhost:3000'), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isSaving: false }) });
    expect((await PATCH(request, { params: Promise.resolve({ id: String(wallet._id) }) })).status).toBe(401);
  });
});
