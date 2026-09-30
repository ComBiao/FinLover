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

//=============== POST Method tests ===============//
const post = (body: unknown, authorization?: string) => new NextRequest('http://localhost:3000/api/v1/wallets', {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) },
  body: JSON.stringify(body),
});
// An omitted authorization uses the fixture token; an explicit `undefined` means no login.
const create = (body: unknown, ...authorization: [string?]) =>
  v1.createWallet(post(body, authorization.length === 0 ? `Bearer ${token}` : authorization[0]), context());

describe('POST /api/v1/wallets', () => {
  it('creates a wallet owned by the caller with the saving and hide settings applied', async () => {
    const response = await create({ name: 'Holiday fund', isSaving: true, hideBalance: true });

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload).toMatchObject({ status: true });
    expect(payload.data).toMatchObject({
      name: 'Holiday fund',
      balance: 0,
      isSaving: true,
      hideBalance: true,
    });

    const stored = await Wallet.findById(payload.data.id);
    expect(String(stored!.userId)).toBe(userId);
    expect(stored!.isSaving).toBe(true);
    expect(stored!.hideBalance).toBe(true);
  });

  it('uses defaults when only a name is sent', async () => {
    const response = await create({ name: 'Cash' });

    expect(response.status).toBe(201);
    expect((await response.json()).data).toMatchObject({
      name: 'Cash',
      balance: 0,
      isSaving: false,
      hideBalance: false,
      isDefault: false,
    });
  });

  it('ignores owner, balance, default and unknown fields in the body (no mass assignment)', async () => {
    const response = await create({
      name: 'Sneaky',
      userId: otherUserId,
      balance: 999999,
      isDefault: true,
      _id: new mongoose.Types.ObjectId().toString(),
      createdAt: '2000-01-01T00:00:00.000Z',
      unknownField: 'ignored',
    });

    expect(response.status).toBe(201);
    const { data } = await response.json();
    const stored = await Wallet.findById(data.id).lean();
    expect(String(stored!.userId)).toBe(userId);
    expect(stored!.balance).toBe(0);
    expect(stored!.isDefault).toBe(false);
    expect(String(stored!._id)).not.toBe(undefined);
    expect(stored).not.toHaveProperty('unknownField');
    expect(await Wallet.countDocuments({ userId: otherUserId })).toBe(0);
  });

  it('shows the new wallet in the wallet list', async () => {
    const created = await (await create({ name: 'Savings' })).json();

    const list = await v1.listWallets(request('/api/v1/wallets', `Bearer ${token}`), context());

    expect(list.status).toBe(200);
    expect((await list.json()).data).toContainEqual(
      expect.objectContaining({ id: created.data.id, name: 'Savings' }),
    );
  });

  it('returns 409 for a duplicate name for the same user and creates nothing', async () => {
    await Wallet.create({ userId, name: 'Main' });

    const response = await create({ name: 'Main' });

    expect(response.status).toBe(409);
    const payload = await response.json();
    expect(payload).toMatchObject({ status: false });
    expect(payload.error.code).toBe('CONFLICT');
    expect(await Wallet.countDocuments({ userId })).toBe(1);
  });

  it('treats a name that only differs by surrounding whitespace as a duplicate', async () => {
    await Wallet.create({ userId, name: 'Main' });

    const response = await create({ name: '  Main  ' });

    expect(response.status).toBe(409);
    expect(await Wallet.countDocuments({ userId })).toBe(1);
  });

  it('allows the same name for a different user', async () => {
    await Wallet.create({ userId: otherUserId, name: 'Main' });

    const response = await create({ name: 'Main' });

    expect(response.status).toBe(201);
    expect(await Wallet.countDocuments({ name: 'Main' })).toBe(2);
  });

  it.each([
    ['a missing name', {}],
    ['a blank name', { name: '   ' }],
    ['a name over 50 characters', { name: 'a'.repeat(51) }],
    ['a non-boolean saving flag', { name: 'Bad', isSaving: 'yes' }],
    ['an invalid color', { name: 'Bad', color: 'red' }],
  ])('returns 400 for %s and creates nothing', async (_label, body) => {
    const response = await create(body);

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

    const response = await v1.createWallet(malformed, context());

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INVALID_JSON');
    expect(await Wallet.countDocuments()).toBe(0);
  });

  it('returns 401 without a login and creates nothing', async () => {
    const response = await create({ name: 'Main' }, undefined);

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('UNAUTHORIZED');
    expect(await Wallet.countDocuments()).toBe(0);
  });
});
  
