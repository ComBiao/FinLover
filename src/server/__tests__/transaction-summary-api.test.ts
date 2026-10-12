// @vitest-environment node
/** GET /api/v1/transactions/summary → src/app/api/v1/transactions/summary/route.ts */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import Wallet from '@/server/db/models/Wallet';
import User from '@/server/db/models/User';
import Category from '@/server/db/models/Category';
import Transaction from '@/server/db/models/Transaction';
import { signToken } from '@/server/shared/auth/crypto';
import { seedUser } from '@/test/user-fixture';

vi.mock('server-only', () => ({}));
vi.mock('@/server/db/index', () => ({ connectDB: vi.fn(async () => {}), default: vi.fn(async () => {}) }));

let GET: typeof import('@/app/api/v1/transactions/summary/route').GET;
const USER = new mongoose.Types.ObjectId();
const OTHER = new mongoose.Types.ObjectId();
const TOKEN = signToken({ userId: USER.toString() });
let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri());
  await Promise.all([Wallet.init(), Category.init()]);
  GET = (await import('@/app/api/v1/transactions/summary/route')).GET;
}, 60_000);
afterAll(async () => { await mongoose.disconnect(); await replSet?.stop(); }, 60_000);
beforeEach(async () => {
  await Promise.all([Wallet.deleteMany({}), User.deleteMany({}), Category.deleteMany({}), Transaction.collection.deleteMany({})]);
  await seedUser(USER);
});

function call(query: string, token: string | null = TOKEN) {
  return GET(new NextRequest(`http://localhost:3000/api/v1/transactions/summary${query}`, {
    method: 'GET',
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  }));
}
const totals = async (query: string) => (await (await call(query)).json()).data;

// Fixture rows go straight to the collection: the model rejects writes outside a transaction service.
async function seed() {
  const [cash, bank] = await Wallet.create([{ userId: USER, name: 'Cash' }, { userId: USER, name: 'Bank' }]);
  const theirWallet = await Wallet.create({ userId: OTHER, name: 'Theirs' });
  const [salary, food, othersExpense, othersIncome] = await Category.create([
    { userId: USER, name: 'Salary', type: 'income', isSystem: true, icon: 'Wallet', color: '#22C55E' },
    { userId: USER, name: 'Food & Drinks', type: 'expense', isSystem: true, icon: 'Utensils', color: '#F97316' },
    { userId: USER, name: 'Others', type: 'expense', isSystem: true, icon: 'MoreHorizontal', color: '#4B5563' },
    { userId: USER, name: 'Others', type: 'income', isSystem: true, icon: 'MoreHorizontal', color: '#4B5563' },
  ]);
  const row = (fields: Record<string, unknown>) => ({ userId: USER, walletId: cash._id, categoryId: null, title: 'Fixture', createdAt: new Date(), updatedAt: new Date(), ...fields });
  await Transaction.collection.insertMany([
    row({ type: 'income', amount: 60000, categoryId: salary._id, title: 'October salary', date: new Date('2026-10-01T00:00:00.000Z') }),
    row({ type: 'income', amount: 300, title: 'Refund', notes: 'Lunch money back', date: new Date('2026-10-31T00:00:00.000Z') }),
    row({ type: 'expense', amount: 7000, categoryId: food._id, title: 'Groceries', date: new Date('2026-10-15T00:00:00.000Z') }),
    row({ type: 'expense', amount: 495, walletId: bank._id, title: 'Lunch', date: new Date('2026-10-20T00:00:00.000Z') }),
    row({ type: 'expense', amount: 1000, categoryId: food._id, title: 'Dinner', date: new Date('2026-09-30T00:00:00.000Z') }),
    row({ type: 'income', amount: 5000, categoryId: salary._id, title: 'November salary', date: new Date('2026-11-01T00:00:00.000Z') }),
    row({ userId: OTHER, walletId: theirWallet._id, type: 'income', amount: 99999, date: new Date('2026-10-10T00:00:00.000Z') }),
  ]);
  return { cash, bank, theirWallet, food, othersExpense, othersIncome };
}

const OCTOBER = '?from=2026-10-01&to=2026-10-31';

describe('GET /api/v1/transactions/summary (#156)', () => {
  it('totals the inclusive date range for the caller only', async () => {
    await seed();

    const res = await call(OCTOBER);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: true, data: { totalIncome: 60300, totalExpense: 7495, netBalance: 52805 } });
  });

  it('covers a whole year and a single day', async () => {
    await seed();

    expect(await totals('?from=2026-01-01&to=2026-12-31')).toEqual({ totalIncome: 65300, totalExpense: 8495, netBalance: 56805 });
    expect(await totals('?from=2026-10-31&to=2026-10-31')).toEqual({ totalIncome: 300, totalExpense: 0, netBalance: 300 });
  });

  it('applies the wallet, type, category and search filters', async () => {
    const { bank, food } = await seed();

    expect(await totals(`${OCTOBER}&walletId=${bank._id}`)).toEqual({ totalIncome: 0, totalExpense: 495, netBalance: -495 });
    expect(await totals(`${OCTOBER}&type=income`)).toEqual({ totalIncome: 60300, totalExpense: 0, netBalance: 60300 });
    expect(await totals(`${OCTOBER}&categoryId=${food._id}`)).toEqual({ totalIncome: 0, totalExpense: 7000, netBalance: -7000 });
    expect(await totals(`${OCTOBER}&search=LUNCH`)).toEqual({ totalIncome: 300, totalExpense: 495, netBalance: -195 });
  });

  it("counts transactions without a category under their own type's Others", async () => {
    const { othersExpense, othersIncome } = await seed();

    expect(await totals(`${OCTOBER}&categoryId=${othersExpense._id}`)).toEqual({ totalIncome: 0, totalExpense: 495, netBalance: -495 });
    expect(await totals(`${OCTOBER}&categoryId=${othersIncome._id}`)).toEqual({ totalIncome: 300, totalExpense: 0, netBalance: 300 });
  });

  it('returns zeros when nothing matches', async () => {
    await seed();

    expect(await totals(`${OCTOBER}&search=nothing-like-this`)).toEqual({ totalIncome: 0, totalExpense: 0, netBalance: 0 });
  });

  it("returns 404 for another user's wallet or category", async () => {
    const { theirWallet } = await seed();
    const theirCategory = await Category.create({ userId: OTHER, name: 'Theirs', type: 'expense', icon: 'Utensils', color: '#000000' });

    expect((await call(`${OCTOBER}&walletId=${theirWallet._id}`)).status).toBe(404);
    expect((await call(`${OCTOBER}&categoryId=${theirCategory._id}`)).status).toBe(404);
  });

  it.each([
    ['a missing range', ''],
    ['a malformed date', '?from=2026-10-01&to=2026-10-32'],
    ['from after to', '?from=2026-10-31&to=2026-10-01'],
    ['a malformed wallet id', `${OCTOBER}&walletId=nope`],
    ['an unknown type', `${OCTOBER}&type=transfer`],
    ['an over-long search', `${OCTOBER}&search=${'a'.repeat(101)}`],
  ])('returns 400 for %s', async (_name, query) => {
    const res = await call(query);

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 without credentials', async () => {
    expect((await call(OCTOBER, null)).status).toBe(401);
  });
});
