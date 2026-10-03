import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import Wallet from '@/server/db/models/Wallet';
import { signToken } from '@/server/shared/auth/crypto';

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
  it('returns an owned wallet including its balance, color, saving, and hide settings', async () => {
    const wallet = await Wallet.create({
      userId,
      name: 'Holiday fund',
      balance: 1250.5,
      color: '#12AB34',
      isSaving: true,
      goalAmount: 5000,
      hideBalance: true,
    });

    const response = await v1.getWallet(request(`/api/v1/wallets/${wallet._id}`, `Bearer ${token}`), context(String(wallet._id)));

    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      id: String(wallet._id),
      balance: 1250.5,
      color: '#12AB34',
      isSaving: true,
      goalAmount: 5000,
      hideBalance: true,
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
