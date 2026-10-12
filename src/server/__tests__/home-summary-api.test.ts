// @vitest-environment node
/** GET /api/v1/home/summary → src/app/api/v1/home/summary/route.ts */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import Wallet from '@/server/db/models/Wallet';
import User from '@/server/db/models/User';
import { signToken } from '@/server/shared/auth/crypto';
import { seedUser } from '@/test/user-fixture';

vi.mock('server-only', () => ({}));
vi.mock('@/server/db/index', () => ({ connectDB: vi.fn(async () => {}), default: vi.fn(async () => {}) }));

let GET: typeof import('@/app/api/v1/home/summary/route').GET;
const USER = new mongoose.Types.ObjectId();
const OTHER = new mongoose.Types.ObjectId();
const TOKEN = signToken({ userId: USER.toString() });
let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri());
  await Wallet.init();
  GET = (await import('@/app/api/v1/home/summary/route')).GET;
}, 60_000);
afterAll(async () => { await mongoose.disconnect(); await replSet?.stop(); }, 60_000);
beforeEach(async () => {
  await Promise.all([Wallet.deleteMany({}), User.deleteMany({})]);
  await seedUser(USER);
});

function call(query = '', token: string | null = TOKEN) {
  return GET(new NextRequest(`http://localhost:3000/api/v1/home/summary${query}`, {
    method: 'GET',
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  }));
}

describe('GET /api/v1/home/summary — total balance (#89)', () => {
  it('sums the balances of every owned wallet and ignores other users', async () => {
    await Wallet.create([
      { userId: USER, name: 'Cash', balance: 1500.25 },
      { userId: USER, name: 'Bank', balance: 2000 },
      { userId: OTHER, name: 'Theirs', balance: 99999 },
    ]);

    const res = await call('?month=2026-10');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: true,
      data: { month: '2026-10', walletId: 'all', balance: { hasWallets: true, totalBalance: 3500.25 } },
    });
  });

  it('scopes the total to one owned wallet', async () => {
    const [, bank] = await Wallet.create([
      { userId: USER, name: 'Cash', balance: 1500.25 },
      { userId: USER, name: 'Bank', balance: 2000 },
    ]);

    const json = await (await call(`?month=2026-10&walletId=${bank._id}`)).json();

    expect(json.data.balance).toEqual({ hasWallets: true, totalBalance: 2000 });
  });

  it('returns 0 for a user without wallets, defaulting to the current month', async () => {
    const json = await (await call()).json();

    expect(json.data.balance).toEqual({ hasWallets: false, totalBalance: 0 });
    expect(json.data.month).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it("returns 404 for another user's wallet and an unknown wallet", async () => {
    const theirs = await Wallet.create({ userId: OTHER, name: 'Theirs', balance: 50 });

    expect((await call(`?walletId=${theirs._id}`)).status).toBe(404);
    expect((await call(`?walletId=${new mongoose.Types.ObjectId()}`)).status).toBe(404);
  });

  it.each([
    ['a malformed month', '?month=2026-13'],
    ['a month in the wrong format', '?month=10-2026'],
    ['a malformed wallet id', '?walletId=not-an-id'],
  ])('returns 400 for %s', async (_name, query) => {
    const res = await call(query);

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 without credentials', async () => {
    expect((await call('', null)).status).toBe(401);
  });
});
