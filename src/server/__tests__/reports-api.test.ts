// @vitest-environment node
/** GET /api/v1/reports/{summary,cash-flow,category-distribution,running-balance} → src/app/api/v1/reports/<name>/route.ts */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import Wallet from '@/server/db/models/Wallet';
import User from '@/server/db/models/User';
import Transaction from '@/server/db/models/Transaction';
import Category from '@/server/db/models/Category';
import { signToken } from '@/server/shared/auth/crypto';
import { seedUser } from '@/test/user-fixture';

vi.mock('server-only', () => ({}));
vi.mock('@/server/db/index', () => ({ connectDB: vi.fn(async () => {}), default: vi.fn(async () => {}) }));

type Route = (request: NextRequest) => Promise<Response>;
const routes: Record<string, Route> = {};
const USER = new mongoose.Types.ObjectId();
const OTHER = new mongoose.Types.ObjectId();
const TOKEN = signToken({ userId: USER.toString() });
let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri());
  await Wallet.init();
  routes.summary = (await import('@/app/api/v1/reports/summary/route')).GET;
  routes['cash-flow'] = (await import('@/app/api/v1/reports/cash-flow/route')).GET;
  routes['category-distribution'] = (await import('@/app/api/v1/reports/category-distribution/route')).GET;
  routes['running-balance'] = (await import('@/app/api/v1/reports/running-balance/route')).GET;
}, 60_000);
afterAll(async () => { await mongoose.disconnect(); await replSet?.stop(); }, 60_000);
beforeEach(async () => {
  await Promise.all([Wallet.deleteMany({}), User.deleteMany({}), Transaction.collection.deleteMany({}), Category.deleteMany({})]);
  await seedUser(USER);
});

function call(name: string, query = '', token: string | null = TOKEN) {
  return routes[name](new NextRequest(`http://localhost:3000/api/v1/reports/${name}${query}`, {
    method: 'GET',
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  }));
}
const data = async (name: string, query: string) => {
  const res = await call(name, query);
  const json = await res.json();
  expect(res.status, JSON.stringify(json)).toBe(200);
  expect(json.status).toBe(true);
  return json.data;
};

// Fixture rows go straight to the collection: the model rejects writes outside a transaction service.
const seedTransaction = (fields: Record<string, unknown>) => Transaction.collection.insertOne({
  userId: USER, categoryId: null, title: 'Fixture', createdAt: new Date(), updatedAt: new Date(), ...fields,
});
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe('GET /api/v1/reports/* — validation and access (US8-1)', () => {
  const names = ['summary', 'cash-flow', 'category-distribution', 'running-balance'];

  it.each([
    ['an end date before the start date', '?startDate=2026-09-30&endDate=2026-09-01', 'endDate'],
    ['an empty wallet selection', '?walletIds=&startDate=2026-09-01&endDate=2026-09-30', 'walletIds'],
    ['a malformed wallet id', '?walletIds=cash&startDate=2026-09-01&endDate=2026-09-30', 'walletIds'],
    ['a missing start date', '?endDate=2026-09-30', 'startDate'],
    ['an impossible date', '?startDate=2026-02-30&endDate=2026-03-01', 'startDate'],
  ])('rejects %s with 400 VALIDATION_ERROR and fields.%s', async (_name, query, field) => {
    for (const name of names) {
      const res = await call(name, query);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json).toMatchObject({ status: false, error: { code: 'VALIDATION_ERROR', fields: { [field]: expect.any(String) } }, path: `/api/v1/reports/${name}` });
    }
  });

  it('rejects an unknown interval and more than 400 buckets or points with fields.interval', async () => {
    const cases: [string, string][] = [
      ['cash-flow', '?startDate=2026-01-01&endDate=2026-12-31&interval=yearly'],
      ['cash-flow', '?startDate=2025-01-01&endDate=2026-12-31&interval=daily'],
      ['running-balance', '?startDate=2026-01-01&endDate=2026-12-31&interval=monthly'],
      ['running-balance', '?startDate=2025-01-01&endDate=2026-12-31'],
    ];
    for (const [name, query] of cases) {
      const res = await call(name, query);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatchObject({ code: 'VALIDATION_ERROR', fields: { interval: expect.any(String) } });
    }
  });

  it("returns 404 for another user's, an unknown or a shared wallet", async () => {
    const mine = await Wallet.create({ userId: USER, name: 'Cash' });
    const theirs = await Wallet.create({ userId: OTHER, name: 'Theirs' });
    const shared = await Wallet.create({ userId: USER, name: 'Trip', isShared: true });
    for (const id of [theirs._id, new mongoose.Types.ObjectId(), shared._id]) {
      for (const name of names) {
        const res = await call(name, `?walletIds=${mine._id},${id}&startDate=2026-09-01&endDate=2026-09-30`);
        expect(res.status).toBe(404);
        expect((await res.json()).error.code).toBe('NOT_FOUND');
      }
    }
  });

  it('returns 401 without credentials', async () => {
    for (const name of names) expect((await call(name, '?startDate=2026-09-01&endDate=2026-09-30', null)).status).toBe(401);
  });
});

describe('GET /api/v1/reports/summary (US8-2)', () => {
  it('totals only the selected wallets and the inclusive range, through sumByType', async () => {
    const [cash, bank, other] = await Wallet.create([{ userId: USER, name: 'Cash' }, { userId: USER, name: 'Bank' }, { userId: USER, name: 'Other' }]);
    const theirs = await Wallet.create({ userId: OTHER, name: 'Theirs' });
    await seedTransaction({ walletId: cash._id, type: 'income', amount: 40000, date: day('2026-09-01') });
    await seedTransaction({ walletId: bank._id, type: 'income', amount: 5000, date: day('2026-09-30') });
    await seedTransaction({ walletId: bank._id, type: 'expense', amount: 30000, date: day('2026-09-15') });
    await seedTransaction({ walletId: other._id, type: 'expense', amount: 999, date: day('2026-09-15') });
    await seedTransaction({ walletId: cash._id, type: 'expense', amount: 111, date: day('2026-10-01') });
    await seedTransaction({ walletId: cash._id, type: 'expense', amount: 222, date: day('2026-08-31') });
    await seedTransaction({ userId: OTHER, walletId: theirs._id, type: 'income', amount: 77777, date: day('2026-09-10') });

    expect(await data('summary', `?walletIds=${cash._id},${bank._id}&startDate=2026-09-01&endDate=2026-09-30`))
      .toEqual({ totalIncome: 45000, totalExpense: 30000, netCashFlow: 15000, transactionCount: 3 });
    expect(await data('summary', '?startDate=2026-09-01&endDate=2026-09-30'))
      .toEqual({ totalIncome: 45000, totalExpense: 30999, netCashFlow: 14001, transactionCount: 4 });
  });

  it('returns zeros for a period without transactions', async () => {
    const cash = await Wallet.create({ userId: USER, name: 'Cash', balance: 100 });

    expect(await data('summary', `?walletIds=${cash._id}&startDate=2030-01-01&endDate=2030-01-31`))
      .toEqual({ totalIncome: 0, totalExpense: 0, netCashFlow: 0, transactionCount: 0 });
  });
});

describe('GET /api/v1/reports/cash-flow (US8-3)', () => {
  it('suggests an interval and returns every bucket, empty ones at zero', async () => {
    const cash = await Wallet.create({ userId: USER, name: 'Cash' });
    await seedTransaction({ walletId: cash._id, type: 'income', amount: 1000, date: day('2026-07-10') });
    await seedTransaction({ walletId: cash._id, type: 'expense', amount: 250.25, date: day('2026-07-31') });
    await seedTransaction({ walletId: cash._id, type: 'expense', amount: 80, date: day('2026-09-30') });

    const suggested = await data('cash-flow', `?walletIds=${cash._id}&startDate=2026-07-01&endDate=2026-12-31`);
    expect(suggested.interval).toBe('monthly');
    expect(suggested.suggestedInterval).toBe('monthly');
    expect(suggested.buckets).toEqual([
      { label: '2026-07', start: '2026-07-01', end: '2026-07-31', income: 1000, expense: 250.25 },
      { label: '2026-08', start: '2026-08-01', end: '2026-08-31', income: 0, expense: 0 },
      { label: '2026-09', start: '2026-09-01', end: '2026-09-30', income: 0, expense: 80 },
      { label: '2026-10', start: '2026-10-01', end: '2026-10-31', income: 0, expense: 0 },
      { label: '2026-11', start: '2026-11-01', end: '2026-11-30', income: 0, expense: 0 },
      { label: '2026-12', start: '2026-12-01', end: '2026-12-31', income: 0, expense: 0 },
    ]);

    const weekly = await data('cash-flow', `?walletIds=${cash._id}&startDate=2026-07-01&endDate=2026-12-31&interval=weekly`);
    expect(weekly).toMatchObject({ interval: 'weekly', suggestedInterval: 'monthly' });
    expect(weekly.buckets).toHaveLength(27);
    expect(weekly.buckets[0]).toEqual({ label: '2026-07-01', start: '2026-07-01', end: '2026-07-05', income: 0, expense: 0 });
  });
});

describe('GET /api/v1/reports/category-distribution (US8-4)', () => {
  it("merges transactions of deleted categories into the type's Others and leaves an empty type empty", async () => {
    const cash = await Wallet.create({ userId: USER, name: 'Cash' });
    const [food, others] = await Category.create([
      { userId: USER, name: 'Food', type: 'expense', icon: 'Utensils', color: '#F97316' },
      { userId: USER, name: 'Others', type: 'expense', isSystem: true, icon: 'MoreHorizontal', color: '#9CA3AF' },
    ]);
    await seedTransaction({ walletId: cash._id, categoryId: food._id, type: 'expense', amount: 200, date: day('2026-09-02') });
    await seedTransaction({ walletId: cash._id, categoryId: null, type: 'expense', amount: 50, date: day('2026-09-03') });
    await seedTransaction({ walletId: cash._id, categoryId: others._id, type: 'expense', amount: 50, date: day('2026-09-04') });

    expect(await data('category-distribution', `?walletIds=${cash._id}&startDate=2026-09-01&endDate=2026-09-30`)).toEqual({
      income: { total: 0, items: [] },
      expense: {
        total: 300,
        items: [
          { categoryId: String(food._id), name: 'Food', icon: 'Utensils', color: '#F97316', amount: 200, percentage: 66.7 },
          { categoryId: String(others._id), name: 'Others', icon: 'MoreHorizontal', color: '#9CA3AF', amount: 100, percentage: 33.3 },
        ],
      },
    });
  });
});

describe('GET /api/v1/reports/running-balance (US8-5)', () => {
  it('starts from the balance before startDate and carries it over days without transactions', async () => {
    // Current balances 15,900 across two wallets; a transaction after endDate still counts toward the opening balance.
    const [cash, bank] = await Wallet.create([{ userId: USER, name: 'Cash', balance: 10900 }, { userId: USER, name: 'Bank', balance: 5000 }]);
    await seedTransaction({ walletId: cash._id, type: 'income', amount: 500, date: day('2026-10-01') });
    await seedTransaction({ walletId: bank._id, type: 'income', amount: 3000, date: day('2026-10-03') });
    await seedTransaction({ walletId: cash._id, type: 'expense', amount: 700, date: day('2026-10-03') });
    await seedTransaction({ walletId: cash._id, type: 'income', amount: 700, date: day('2026-10-20') });
    await seedTransaction({ walletId: cash._id, type: 'expense', amount: 5000, date: day('2026-09-15') });

    const result = await data('running-balance', `?walletIds=${cash._id},${bank._id}&startDate=2026-10-01&endDate=2026-10-15`);

    expect(result).toMatchObject({ interval: 'daily', openingBalance: 12400, closingBalance: 15200 });
    expect(result.points).toHaveLength(15);
    expect(result.points.slice(0, 4)).toEqual([
      { date: '2026-10-01', balance: 12900 },
      { date: '2026-10-02', balance: 12900 },
      { date: '2026-10-03', balance: 15200 },
      { date: '2026-10-04', balance: 15200 },
    ]);
    expect(result.points.at(-1)).toEqual({ date: '2026-10-15', balance: 15200 });
  });
});
