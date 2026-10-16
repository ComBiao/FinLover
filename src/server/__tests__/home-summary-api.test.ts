// @vitest-environment node
/** GET /api/v1/home/summary → src/app/api/v1/home/summary/route.ts */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import Wallet from '@/server/db/models/Wallet';
import User from '@/server/db/models/User';
import Transaction from '@/server/db/models/Transaction';
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
  await Promise.all([Wallet.deleteMany({}), User.deleteMany({}), Transaction.collection.deleteMany({})]);
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
    const json = await res.json();
    expect(json.status).toBe(true);
    expect(json.data).toMatchObject({ month: '2026-10', walletId: 'all', balance: { hasWallets: true, totalBalance: 3500.25 } });
  });

  it('scopes the total to one owned wallet', async () => {
    const [, bank] = await Wallet.create([
      { userId: USER, name: 'Cash', balance: 1500.25 },
      { userId: USER, name: 'Bank', balance: 2000 },
    ]);

    const json = await (await call(`?month=2026-10&walletId=${bank._id}`)).json();

    expect(json.data.balance).toEqual({ hasWallets: true, totalBalance: 2000, savingGoal: null });
  });

  it('returns 0 for a user without wallets, defaulting to the current month', async () => {
    const json = await (await call()).json();

    expect(json.data.balance).toEqual({ hasWallets: false, totalBalance: 0, savingGoal: null });
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

describe('GET /api/v1/home/summary — income, expense and net (#90, #91, #92)', () => {
  // Fixture rows go straight to the collection: the model rejects writes outside a transaction service.
  const seedTransaction = (fields: Record<string, unknown>) => Transaction.collection.insertOne({
    userId: USER, categoryId: null, title: 'Fixture', createdAt: new Date(), updatedAt: new Date(), ...fields,
  });

  it("totals the month's transactions across wallets, leaving out other months and users", async () => {
    const [cash, bank] = await Wallet.create([{ userId: USER, name: 'Cash' }, { userId: USER, name: 'Bank' }]);
    const theirs = await Wallet.create({ userId: OTHER, name: 'Theirs' });
    await seedTransaction({ walletId: cash._id, type: 'income', amount: 60300, date: new Date('2026-10-01T00:00:00.000Z') });
    await seedTransaction({ walletId: cash._id, type: 'expense', amount: 7000, date: new Date('2026-10-31T00:00:00.000Z') });
    await seedTransaction({ walletId: bank._id, type: 'expense', amount: 495, date: new Date('2026-10-15T00:00:00.000Z') });
    await seedTransaction({ walletId: cash._id, type: 'expense', amount: 1000, date: new Date('2026-09-30T00:00:00.000Z') });
    await seedTransaction({ walletId: cash._id, type: 'income', amount: 5000, date: new Date('2026-11-01T00:00:00.000Z') });
    await seedTransaction({ userId: OTHER, walletId: theirs._id, type: 'income', amount: 99999, date: new Date('2026-10-10T00:00:00.000Z') });

    const all = (await (await call('?month=2026-10')).json()).data;
    const bankOnly = (await (await call(`?month=2026-10&walletId=${bank._id}`)).json()).data;

    expect(all).toMatchObject({ income: 60300, expense: 7495, net: { net: 52805, status: 'surplus' } });
    expect(bankOnly).toMatchObject({ income: 0, expense: 495, net: { net: -495, status: 'overspending' } });
  });

  it('returns zero totals for a month without transactions', async () => {
    await Wallet.create({ userId: USER, name: 'Cash', balance: 100 });

    const data = (await (await call('?month=2030-01')).json()).data;

    expect(data).toMatchObject({ income: 0, expense: 0, net: { net: 0, status: 'even' } });
  });
});

describe('GET /api/v1/home/summary — saving goal progress (#81)', () => {
  it('embeds progress for a selected saving wallet with a goal', async () => {
    const fund = await Wallet.create({ userId: USER, name: 'Emergency fund', balance: 12400, isSaving: true, goalAmount: 20000 });

    const data = (await (await call(`?walletId=${fund._id}`)).json()).data;

    expect(data.balance).toEqual({
      hasWallets: true,
      totalBalance: 12400,
      savingGoal: { walletId: String(fund._id), walletName: 'Emergency fund', goal: 20000, current: 12400, percent: 62, remaining: 7600, reached: false },
    });
  });

  it('leaves it null for all wallets and for a regular wallet', async () => {
    await Wallet.create({ userId: USER, name: 'Emergency fund', balance: 12400, isSaving: true, goalAmount: 20000 });
    const cash = await Wallet.create({ userId: USER, name: 'Cash', balance: 10 });

    expect((await (await call()).json()).data.balance.savingGoal).toBeNull();
    expect((await (await call(`?walletId=${cash._id}`)).json()).data.balance.savingGoal).toBeNull();
  });
});
