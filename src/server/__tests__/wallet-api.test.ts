import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import Wallet from '@/server/db/models/Wallet';
import { signToken } from '@/server/shared/auth/crypto';
import { POST as postWalletRoute } from '@/app/api/v1/wallets/route';

vi.mock('@/server/db/index', () => ({ connectDB: vi.fn(async () => {}) }));

import { v1 } from '@/server/shared/http/versioned-handlers';

const userId = new mongoose.Types.ObjectId().toString();
const otherUserId = new mongoose.Types.ObjectId().toString();
const token = signToken({ userId });
const context = (id = '') => ({ params: Promise.resolve({ id }) });
const request = (path: string, authorization?: string) => new NextRequest(`http://localhost:3000${path}`, {
  method: 'GET',
  headers: authorization ? { authorization } : undefined,
});
const postRequest = (body: unknown, authorization: string | null = `Bearer ${token}`) => new NextRequest('http://localhost:3000/api/v1/wallets', {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) },
  body: JSON.stringify(body),
});
const createWallet = (body: unknown, authorization: string | null = `Bearer ${token}`) => postWalletRoute(postRequest(body, authorization));

let mongo: MongoMemoryReplSet;

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Wallet.init();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

beforeEach(async () => {
  await Wallet.deleteMany({});
});

//=============== POST Method tests ===============//
describe('POST /api/v1/wallets', () => {
  it('creates a wallet for the authenticated user with the requested saving settings', async () => {
    const response = await createWallet({ name: 'Holiday fund', color: '#12AB34', isSaving: true, goalAmount: 5000 });

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload).toMatchObject({ status: true });
    expect(payload.data).toMatchObject({ name: 'Holiday fund', balance: 0, isSaving: true, goalAmount: 5000 });
    expect(payload.data).not.toHaveProperty('userId');

    const stored = await Wallet.findById(payload.data.id);
    expect(String(stored!.userId)).toBe(userId);
    expect(stored!.isSaving).toBe(true);
  });

  it('uses defaults when only a name is sent', async () => {
    const response = await createWallet({ name: 'Cash' });

    expect(response.status).toBe(201);
    expect((await response.json()).data).toMatchObject({ name: 'Cash', balance: 0, isSaving: false, isDefault: false });
  });

  it('ignores owner, balance, default and unknown fields in the body', async () => {
    const clientId = new mongoose.Types.ObjectId().toString();
    const response = await createWallet({
      name: 'Sneaky',
      userId: otherUserId,
      balance: 999999,
      isDefault: true,
      _id: clientId,
      createdAt: '2000-01-01T00:00:00.000Z',
      unknownField: 'ignored',
    });

    expect(response.status).toBe(201);
    const { data } = await response.json();
    const stored = await Wallet.findById(data.id).lean();
    expect(String(stored!.userId)).toBe(userId);
    expect(stored!.balance).toBe(0);
    expect(stored!.isDefault).toBe(false);
    expect(String(stored!._id)).not.toBe(clientId);
    expect(stored).not.toHaveProperty('unknownField');
    expect(await Wallet.countDocuments({ userId: otherUserId })).toBe(0);
  });

  it('makes a newly created wallet available through GET list', async () => {
    const created = await (await createWallet({ name: 'Savings' })).json();
    const listed = await v1.listWallets(request('/api/v1/wallets', `Bearer ${token}`), context());

    expect(listed.status).toBe(200);
    expect((await listed.json()).data).toContainEqual(expect.objectContaining({ id: created.data.id, name: 'Savings' }));
  });

  it('returns 409 for a duplicate name and creates nothing', async () => {
    await Wallet.create({ userId, name: 'Main' });
    const response = await createWallet({ name: 'Main' });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ status: false, error: { code: 'CONFLICT', fields: { name: 'A wallet with this name already exists' } } });
    expect(await Wallet.countDocuments({ userId })).toBe(1);
  });

  it('treats surrounding whitespace as a duplicate name', async () => {
    await Wallet.create({ userId, name: 'Main' });
    const response = await createWallet({ name: '  Main  ' });

    expect(response.status).toBe(409);
    expect(await Wallet.countDocuments({ userId })).toBe(1);
  });

  it('allows the same wallet name for a different user', async () => {
    await Wallet.create({ userId: otherUserId, name: 'Main' });
    const response = await createWallet({ name: 'Main' });

    expect(response.status).toBe(201);
    expect(await Wallet.countDocuments({ name: 'Main' })).toBe(2);
  });

  it.each([
    ['a missing name', {}],
    ['a blank name', { name: '   ' }],
    ['a name over 50 characters', { name: 'a'.repeat(51) }],
    ['a non-boolean saving flag', { name: 'Bad', isSaving: 'yes' }],
    ['an invalid color', { name: 'Bad', color: 'red' }],
  ])('returns 400 for %s', async (_label, body) => {
    const response = await createWallet(body);

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
    expect(await Wallet.countDocuments()).toBe(0);
  });

  it('returns 400 for malformed JSON', async () => {
    const malformed = new NextRequest('http://localhost:3000/api/v1/wallets', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: '{',
    });
    const response = await postWalletRoute(malformed);

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INVALID_JSON');
    expect(await Wallet.countDocuments()).toBe(0);
  });

  it('returns 401 when the caller is unauthenticated', async () => {
    const response = await createWallet({ name: 'Main' }, null);

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('UNAUTHORIZED');
    expect(await Wallet.countDocuments()).toBe(0);
  });
});

//=============== GET Method tests ===============//
describe('GET /api/v1/wallets', () => {
  it("returns only the caller's wallets with the default wallet first", async () => {
    const regular = await Wallet.create({ userId, name: 'Everyday' });
    const defaultWallet = await Wallet.create({ userId, name: 'Main', isDefault: true });
    await Wallet.create({ userId: otherUserId, name: 'Private' });

    const response = await v1.listWallets(request('/api/v1/wallets', `Bearer ${token}`), context());

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({ status: true });
    expect(payload.data).toEqual([
      expect.objectContaining({ id: String(defaultWallet._id), name: 'Main', isDefault: true }),
      expect.objectContaining({ id: String(regular._id), name: 'Everyday', isDefault: false }),
    ]);
    expect(payload.data).not.toContainEqual(expect.objectContaining({ name: 'Private' }));
  });

  it('returns an empty array when the caller has no wallets', async () => {
    const response = await v1.listWallets(request('/api/v1/wallets', `Bearer ${token}`), context());

    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual([]);
  });

  it('requires authentication and does not fall back from an invalid Bearer token to a cookie', async () => {
    const unauthenticated = await v1.listWallets(request('/api/v1/wallets'), context());
    expect(unauthenticated.status).toBe(401);

    const invalidBearer = new NextRequest('http://localhost:3000/api/v1/wallets', {
      method: 'GET',
      headers: { authorization: 'Bearer invalid', cookie: `session_token=${token}` },
    });
    const rejected = await v1.listWallets(invalidBearer, context());
    expect(rejected.status).toBe(401);
  });

  it('accepts cookie authentication for a GET without an Origin header', async () => {
    await Wallet.create({ userId, name: 'Main' });
    const cookieRequest = new NextRequest('http://localhost:3000/api/v1/wallets', {
      method: 'GET',
      headers: { cookie: `session_token=${token}` },
    });

    const response = await v1.listWallets(cookieRequest, context());

    expect(response.status).toBe(200);
  });
});

describe('GET /api/v1/wallets/{id}', () => {
  it('returns an owned wallet including its balance, color, and saving settings', async () => {
    const wallet = await Wallet.create({
      userId,
      name: 'Holiday fund',
      balance: 1250.5,
      color: '#12AB34',
      isSaving: true,
      goalAmount: 5000,
    });

    const response = await v1.getWallet(request(`/api/v1/wallets/${wallet._id}`, `Bearer ${token}`), context(String(wallet._id)));

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data).toMatchObject({
      id: String(wallet._id),
      balance: 1250.5,
      color: '#12AB34',
      isSaving: true,
      goalAmount: 5000,
    });
  });

  it("returns 404 when the wallet belongs to another user", async () => {
    const wallet = await Wallet.create({ userId: otherUserId, name: 'Private' });

    const response = await v1.getWallet(request(`/api/v1/wallets/${wallet._id}`, `Bearer ${token}`), context(String(wallet._id)));

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a malformed ID', async () => {
    const response = await v1.getWallet(request('/api/v1/wallets/not-an-id', `Bearer ${token}`), context('not-an-id'));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for a valid ID that does not exist', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const response = await v1.getWallet(request(`/api/v1/wallets/${id}`, `Bearer ${token}`), context(id));

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe('NOT_FOUND');
  });

  it('returns 401 without a login', async () => {
    const wallet = await Wallet.create({ userId, name: 'Main' });

    const response = await v1.getWallet(request(`/api/v1/wallets/${wallet._id}`), context(String(wallet._id)));

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('UNAUTHORIZED');
  });
});
