// @vitest-environment node
/** DELETE /api/v1/wallets/[id] → src/app/api/v1/wallets/[id]/route.ts */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import Wallet from '@/server/db/models/Wallet';
import Transaction from '@/server/db/models/Transaction';
import { signToken } from '@/server/shared/auth/crypto';
import { seedTransaction } from '@/test/transaction-fixture';
import { MongoUnitOfWork } from '@/server/db/unit-of-work';
import { WalletRepository } from '@/server/modules/wallets/repositories/WalletRepository';
import { TransactionRepository } from '@/server/modules/transactions/repositories/TransactionRepository';
import { DeleteWalletService } from '@/server/modules/wallets/services/DeleteWalletService';

vi.mock('server-only', () => ({}));
vi.mock('@/server/db/index', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  default: vi.fn().mockResolvedValue(undefined),
}));

let DELETE: typeof import('@/app/api/v1/wallets/[id]/route').DELETE;
const USER = new mongoose.Types.ObjectId();
const OTHER = new mongoose.Types.ObjectId();
const TOKEN = signToken({ userId: USER.toString() });
let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri());
  await Wallet.init();
  DELETE = (await import('@/app/api/v1/wallets/[id]/route')).DELETE;
}, 60_000);
afterAll(async () => { await mongoose.disconnect(); await replSet?.stop(); }, 60_000);
beforeEach(async () => { await Wallet.deleteMany({}); await Transaction.collection.deleteMany({}); });

let seq = 0;
const wallet = (userId = USER, extra: Record<string, unknown> = {}) => Wallet.create({ userId, name: `W${++seq}`, balance: 100, ...extra });
const seedTx = (userId: mongoose.Types.ObjectId, walletId: unknown, n: number) =>
  Promise.all(Array.from({ length: n }, () => seedTransaction(new Transaction({ userId, walletId, type: 'income', amount: 10, date: new Date() }))));
const txCount = (walletId: unknown) => Transaction.collection.countDocuments({ walletId } as never);
function call(id: string, token: string | null = TOKEN) {
  const request = new NextRequest(new URL(`/api/v1/wallets/${id}`, 'http://localhost:3000'), {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return DELETE(request, { params: Promise.resolve({ id }) });
}

describe('DELETE /api/v1/wallets/{id}', () => {
  it('removes the wallet and all 5 of its transactions', async () => {
    const w = await wallet();
    await seedTx(USER, w._id, 5);
    const res = await call(String(w._id));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: true, data: null });
    expect(await Wallet.findById(w._id)).toBeNull();
    expect(await txCount(w._id)).toBe(0);
  });

  it('leaves other wallets and their transactions untouched', async () => {
    const a = await wallet(); const b = await wallet(); const c = await wallet(OTHER);
    await seedTx(USER, a._id, 5); await seedTx(USER, b._id, 2); await seedTx(OTHER, c._id, 1);
    expect((await call(String(a._id))).status).toBe(200);
    expect(await Wallet.countDocuments({ _id: { $in: [b._id, c._id] } })).toBe(2);
    expect(await txCount(b._id)).toBe(2);
    expect(await txCount(c._id)).toBe(1);
  });

  it('returns 404 for a missing wallet and a second delete', async () => {
    const res = await call(String(new mongoose.Types.ObjectId()));
    expect(res.status).toBe(404);
    const w = await wallet();
    expect((await call(String(w._id))).status).toBe(200);
    expect((await call(String(w._id))).status).toBe(404);
  });

  it('returns 404 for another user\'s wallet and deletes nothing', async () => {
    const w = await wallet(OTHER); await seedTx(OTHER, w._id, 3);
    expect((await call(String(w._id))).status).toBe(404);
    expect(await Wallet.findById(w._id)).not.toBeNull();
    expect(await txCount(w._id)).toBe(3);
  });

  it('returns 400 for an invalid id and 401 without credentials', async () => {
    expect((await call('not-an-id')).status).toBe(400);
    const w = await wallet();
    expect((await call(String(w._id), null)).status).toBe(401);
    expect(await Wallet.findById(w._id)).not.toBeNull();
  });

  it('allows deleting the default and only wallet', async () => {
    const w = await wallet(USER, { isDefault: true });
    expect((await call(String(w._id))).status).toBe(200);
    expect(await Wallet.countDocuments({ userId: USER })).toBe(0);
  });

  it('rolls back everything when a later step fails', async () => {
    const w = await wallet(); await seedTx(USER, w._id, 5);
    const repo = new WalletRepository();
    const failing = Object.assign(Object.create(repo), {
      findOwned: repo.findOwned.bind(repo),
      delete: async () => { throw new Error('boom'); },
    });
    const service = new DeleteWalletService(failing, new TransactionRepository(), new MongoUnitOfWork());
    await expect(service.execute(String(w._id), USER.toString())).rejects.toThrow('boom');
    expect(await Wallet.findById(w._id)).not.toBeNull();
    expect(await txCount(w._id)).toBe(5);
  });
});
