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
import WalletMember from '@/server/db/models/WalletMember';
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
  await Promise.all([Wallet.deleteMany({}), User.deleteMany({}), Transaction.collection.deleteMany({}), Category.deleteMany({}), WalletMember.deleteMany({})]);
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

  it("returns 404 for another user's wallet, an unknown one, a shared wallet the caller is not in and a pending invitation", async () => {
    const mine = await Wallet.create({ userId: USER, name: 'Cash' });
    const theirs = await Wallet.create({ userId: OTHER, name: 'Theirs' });
    const strangers = await Wallet.create({ userId: OTHER, name: 'Strangers', isShared: true });
    const invited = await Wallet.create({ userId: OTHER, name: 'Invited', isShared: true });
    await WalletMember.create({ walletId: invited._id, userId: USER, status: 'pending', invitedBy: OTHER });
    for (const id of [theirs._id, new mongoose.Types.ObjectId(), strangers._id, invited._id]) {
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

describe('GET /api/v1/reports/* — shared wallets (Epic 7)', () => {
  /** Alex owns the shared wallet "Trip"; USER joined it (accepted) and also has a personal "Cash". */
  async function seedTrip() {
    await seedUser(OTHER);
    const cash = await Wallet.create({ userId: USER, name: 'Cash', balance: 1000 });
    const trip = await Wallet.create({ userId: OTHER, name: 'Trip', isShared: true, balance: 700 });
    await WalletMember.create({ walletId: trip._id, userId: USER, status: 'accepted', invitedBy: OTHER });
    // rows of both members in the shared wallet, by preset key; the owner's row is not USER's own
    await seedTransaction({ userId: OTHER, walletId: trip._id, type: 'income', amount: 1000, categoryKey: 'salary', date: day('2026-09-02') });
    await seedTransaction({ userId: USER, walletId: trip._id, type: 'expense', amount: 200, categoryKey: 'food-drinks', date: day('2026-09-05') });
    await seedTransaction({ userId: OTHER, walletId: trip._id, type: 'expense', amount: 100, categoryKey: 'food-drinks', date: day('2026-09-06') });
    await seedTransaction({ userId: OTHER, walletId: trip._id, type: 'expense', amount: 0.5, date: day('2026-09-07') });
    await seedTransaction({ walletId: cash._id, type: 'expense', amount: 50, date: day('2026-09-05') });
    return { cash, trip };
  }

  it('leaves shared wallets out unless they are named', async () => {
    await seedTrip();
    const result = await data('summary', '?startDate=2026-09-01&endDate=2026-09-30');
    expect(result).toEqual({ totalIncome: 0, totalExpense: 50, netCashFlow: -50, transactionCount: 1 });
  });

  it('sums every member\'s rows of a named shared wallet, with the personal wallets alongside', async () => {
    const { cash, trip } = await seedTrip();

    const sharedOnly = await data('summary', `?walletIds=${trip._id}&startDate=2026-09-01&endDate=2026-09-30`);
    expect(sharedOnly).toEqual({ totalIncome: 1000, totalExpense: 300.5, netCashFlow: 699.5, transactionCount: 4 });

    const both = await data('summary', `?walletIds=${cash._id},${trip._id}&startDate=2026-09-01&endDate=2026-09-30`);
    expect(both).toEqual({ totalIncome: 1000, totalExpense: 350.5, netCashFlow: 649.5, transactionCount: 5 });
  });

  it('does not let a named personal wallet of the owner leak rows through the shared path', async () => {
    const { trip } = await seedTrip();
    const ownersCash = await Wallet.create({ userId: OTHER, name: 'Alex cash' });
    await seedTransaction({ userId: OTHER, walletId: ownersCash._id, type: 'income', amount: 5000, date: day('2026-09-03') });
    const res = await call('summary', `?walletIds=${trip._id},${ownersCash._id}&startDate=2026-09-01&endDate=2026-09-30`);
    expect(res.status).toBe(404);
  });

  it('buckets shared rows by day in cash flow', async () => {
    const { trip } = await seedTrip();
    const result = await data('cash-flow', `?walletIds=${trip._id}&startDate=2026-09-01&endDate=2026-09-07&interval=daily`);
    const byLabel = Object.fromEntries(result.buckets.map((b: { label: string; income: number; expense: number }) => [b.label, b]));
    expect(byLabel['2026-09-02']).toMatchObject({ income: 1000, expense: 0 });
    expect(byLabel['2026-09-05']).toMatchObject({ income: 0, expense: 200 });
    expect(byLabel['2026-09-06']).toMatchObject({ income: 0, expense: 100 });
    expect(byLabel['2026-09-07']).toMatchObject({ income: 0, expense: 0.5 });
  });

  it('names shared rows after the preset categories and merges them with a personal category of the same name', async () => {
    const { cash, trip } = await seedTrip();
    const food = await Category.create({ userId: USER, name: 'Food & Drinks', type: 'expense', color: '#F97316', icon: 'Utensils', isSystem: true });
    const others = await Category.create({ userId: USER, name: 'Others', type: 'expense', color: '#9CA3AF', icon: 'MoreHorizontal', isSystem: true });
    await seedTransaction({ walletId: cash._id, categoryId: food._id, type: 'expense', amount: 50, date: day('2026-09-08') });

    const result = await data('category-distribution', `?walletIds=${cash._id},${trip._id}&startDate=2026-09-01&endDate=2026-09-30`);

    expect(result.income).toEqual({
      total: 1000,
      items: [{ categoryId: null, name: 'Salary', icon: 'Wallet', color: '#16A34A', amount: 1000, percentage: 100 }],
    });
    // Food & Drinks: 200 + 100 shared + 50 personal = 350, the personal category's id wins; the unkeyed row and the cash row without a category fall into Others
    expect(result.expense.total).toBe(400.5);
    expect(result.expense.items[0]).toMatchObject({ categoryId: String(food._id), name: 'Food & Drinks', amount: 350 });
    expect(result.expense.items.find((item: { name: string }) => item.name === 'Others')).toMatchObject({ categoryId: String(others._id), amount: 50.5 });
  });

  it('works the opening balance of a shared wallet back from its current balance', async () => {
    const { trip } = await seedTrip();
    // Current balance 700; rows on or after 2026-09-05 net -300.5, so 1000.5 stood before.
    const result = await data('running-balance', `?walletIds=${trip._id}&startDate=2026-09-05&endDate=2026-09-08`);
    expect(result).toMatchObject({ openingBalance: 1000.5, closingBalance: 700 });
    expect(result.points.map((point: { balance: number }) => point.balance)).toEqual([800.5, 700.5, 700, 700]);
  });
});
