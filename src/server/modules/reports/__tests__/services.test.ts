import { describe, expect, it, vi } from 'vitest';
import type { WalletRecord } from '@/server/shared/ports/wallets';
import { AppError } from '@/server/shared/kernel/AppError';
import { ReportWalletScope } from '../services/ReportWalletScope';
import { GetReportSummaryService } from '../services/GetReportSummaryService';
import { GetCashFlowService } from '../services/GetCashFlowService';
import { GetCategoryDistributionService } from '../services/GetCategoryDistributionService';
import { GetRunningBalanceService } from '../services/GetRunningBalanceService';

const wallet = (id: string, balance = 0, overrides: Partial<WalletRecord> = {}): WalletRecord => ({
  id, userId: 'user-1', name: id, balance, isDefault: false, isSaving: false,
  createdAt: new Date(0), updatedAt: new Date(0), ...overrides,
});

const WALLETS = [wallet('cash', 1000), wallet('bank', 2000), wallet('saving', 500, { isSaving: true, goalAmount: 1000 }), wallet('shared', 9999, { isShared: true })];
/** A shared wallet owned by someone else that the caller has accepted membership of. */
const TEAM = wallet('team', 300, { userId: 'owner-2', isShared: true });
// list = what the caller owns; listAccessible = owned plus accepted shared memberships (never pending or foreign wallets)
const scope = (wallets = WALLETS, accessible = [...wallets, TEAM]) =>
  new ReportWalletScope({ list: vi.fn(async () => wallets), listAccessible: vi.fn(async () => accessible) });
const expectNotFound = async (promise: Promise<unknown>) => {
  await expect(promise).rejects.toBeInstanceOf(AppError);
  await expect(promise).rejects.toMatchObject({ code: 'NOT_FOUND' });
};

describe('ReportWalletScope', () => {
  it('defaults to every personal wallet, saving wallets included, like Home walletId=all', async () => {
    expect((await scope().resolve('user-1')).map(w => w.id)).toEqual(['cash', 'bank', 'saving']);
  });

  it('returns the requested wallets', async () => {
    expect((await scope().resolve('user-1', ['bank', 'cash'])).map(w => w.id)).toEqual(['bank', 'cash']);
  });

  it('leaves shared wallets out of the default, even ones the caller is a member of', async () => {
    expect((await scope().resolve('user-1')).map(w => w.id)).not.toContain('shared');
    expect((await scope().resolve('user-1')).map(w => w.id)).not.toContain('team');
  });

  it('allows a named shared wallet that the caller owns or has accepted membership of', async () => {
    expect((await scope().resolve('user-1', ['cash', 'shared', 'team'])).map(w => w.id)).toEqual(['cash', 'shared', 'team']);
  });

  it('rejects a missing, foreign or pending wallet with 404', async () => {
    await expectNotFound(scope().resolve('user-1', ['cash', 'someone-elses']));
    // a pending invitation or a shared wallet the caller is not in never shows up in listAccessible
    await expectNotFound(scope(WALLETS, WALLETS).resolve('user-1', ['team']));
  });
});

describe('GetReportSummaryService (US8-2)', () => {
  it('sums the selected wallets over the inclusive range through sumByType', async () => {
    const sumByType = vi.fn(async () => ({ income: 45000, expense: 30000, count: 12 }));
    const result = await new GetReportSummaryService(scope(), { sumByType }).execute('user-1', { walletIds: ['cash', 'bank'], startDate: '2026-09-01', endDate: '2026-09-30' });

    expect(result).toEqual({ totalIncome: 45000, totalExpense: 30000, netCashFlow: 15000, transactionCount: 12 });
    expect(sumByType).toHaveBeenCalledWith('user-1', {
      start: new Date('2026-09-01T00:00:00.000Z'), end: new Date('2026-10-01T00:00:00.000Z'), walletIds: ['cash', 'bank'], sharedWalletIds: [],
    });
  });

  it('rounds money to 2 decimal places and reports zeros when nothing was recorded', async () => {
    const rounded = await new GetReportSummaryService(scope(), { sumByType: async () => ({ income: 0.1 + 0.2, expense: 0.3, count: 3 }) })
      .execute('user-1', { startDate: '2026-09-01', endDate: '2026-09-30' });
    expect(rounded).toEqual({ totalIncome: 0.3, totalExpense: 0.3, netCashFlow: 0, transactionCount: 3 });

    const empty = await new GetReportSummaryService(scope(), { sumByType: async () => ({ income: 0, expense: 0, count: 0 }) })
      .execute('user-1', { startDate: '2026-09-01', endDate: '2026-09-30' });
    expect(empty).toEqual({ totalIncome: 0, totalExpense: 0, netCashFlow: 0, transactionCount: 0 });
  });
});

describe('GetCashFlowService (US8-3)', () => {
  const days = [
    { date: '2026-07-03', income: 40000, expense: 1000 },
    { date: '2026-08-20', income: 0, expense: 2500.5 },
  ];

  it('suggests an interval when none is asked for and fills every bucket', async () => {
    const totalsByDay = vi.fn(async () => days);
    const result = await new GetCashFlowService(scope(), { totalsByDay }).execute('user-1', { startDate: '2026-07-01', endDate: '2026-09-30' });

    expect(result).toEqual({
      interval: 'weekly',
      suggestedInterval: 'weekly',
      buckets: expect.any(Array),
    });
    expect(totalsByDay).toHaveBeenCalledWith('user-1', { start: new Date('2026-07-01T00:00:00.000Z'), end: new Date('2026-10-01T00:00:00.000Z'), walletIds: ['cash', 'bank', 'saving'], sharedWalletIds: [] });
  });

  it('uses the requested interval, keeping income at 0 for an expense-only bucket', async () => {
    const result = await new GetCashFlowService(scope(), { totalsByDay: async () => days }).execute('user-1', { startDate: '2026-07-01', endDate: '2026-09-30', interval: 'monthly' });

    expect(result).toEqual({
      interval: 'monthly',
      suggestedInterval: 'weekly',
      buckets: [
        { label: '2026-07', start: '2026-07-01', end: '2026-07-31', income: 40000, expense: 1000 },
        { label: '2026-08', start: '2026-08-01', end: '2026-08-31', income: 0, expense: 2500.5 },
        { label: '2026-09', start: '2026-09-01', end: '2026-09-30', income: 0, expense: 0 },
      ],
    });
  });

  it('rejects more than 400 buckets with fields.interval before reading data', async () => {
    const totalsByDay = vi.fn(async () => days);
    const promise = new GetCashFlowService(scope(), { totalsByDay }).execute('user-1', { startDate: '2025-01-01', endDate: '2026-12-31', interval: 'daily' });

    await expect(promise).rejects.toMatchObject({ code: 'VALIDATION_ERROR', fields: { interval: expect.any(String) } });
    expect(totalsByDay).not.toHaveBeenCalled();
  });
});

describe('GetCategoryDistributionService (US8-4)', () => {
  const categories = [
    { _id: 'salary', name: 'Salary', type: 'income', icon: 'Briefcase', color: '#16A34A' },
    { _id: 'invest', name: 'Investments', type: 'income', icon: 'PieChart', color: '#0EA5E9' },
    { _id: 'food', name: 'Food', type: 'expense', icon: 'Utensils', color: '#F97316' },
    { _id: 'transport', name: 'Transport', type: 'expense', icon: 'Car', color: '#6366F1' },
    { _id: 'othersExpense', name: 'Others', type: 'expense', isSystem: true, icon: 'MoreHorizontal', color: '#9CA3AF' },
  ];
  type Row = { categoryId: string | null; type: 'income' | 'expense'; amount: number; categoryKey?: string | null; shared?: boolean };
  const run = (rows: Row[], list = categories, walletIds?: string[]) =>
    new GetCategoryDistributionService(
      scope(),
      { totalsByCategory: async () => rows.map(row => ({ categoryKey: null, shared: false, ...row })) },
      { list: async () => list },
    ).execute('user-1', { walletIds, startDate: '2026-09-01', endDate: '2026-09-30' });

  it('splits both types largest first with icon, color and percentages adding up to 100.0', async () => {
    const result = await run([
      { categoryId: 'invest', type: 'income', amount: 5000 },
      { categoryId: 'salary', type: 'income', amount: 40000 },
      { categoryId: 'food', type: 'expense', amount: 20000 },
      { categoryId: 'transport', type: 'expense', amount: 10000 },
    ]);

    expect(result.income).toEqual({
      total: 45000,
      items: [
        { categoryId: 'salary', name: 'Salary', icon: 'Briefcase', color: '#16A34A', amount: 40000, percentage: 88.9 },
        { categoryId: 'invest', name: 'Investments', icon: 'PieChart', color: '#0EA5E9', amount: 5000, percentage: 11.1 },
      ],
    });
    expect(result.expense.items.map(item => [item.name, item.percentage])).toEqual([['Food', 66.7], ['Transport', 33.3]]);
  });

  it("merges category-less rows into the type's Others before taking percentages", async () => {
    const result = await run([
      { categoryId: 'othersExpense', type: 'expense', amount: 100 },
      { categoryId: null, type: 'expense', amount: 200 },
      { categoryId: 'food', type: 'expense', amount: 100 },
    ]);

    expect(result.expense).toEqual({
      total: 400,
      items: [
        { categoryId: 'othersExpense', name: 'Others', icon: 'MoreHorizontal', color: '#9CA3AF', amount: 300, percentage: 75 },
        { categoryId: 'food', name: 'Food', icon: 'Utensils', color: '#F97316', amount: 100, percentage: 25 },
      ],
    });
  });

  it('falls back to "Other (No Category)" when that type has no Others, and is empty when a type has no rows', async () => {
    const result = await run([{ categoryId: null, type: 'income', amount: 250 }]);

    expect(result.income).toEqual({ total: 250, items: [{ categoryId: null, name: 'Other (No Category)', icon: null, color: null, amount: 250, percentage: 100 }] });
    expect(result.expense).toEqual({ total: 0, items: [] });
  });

  it('names shared wallet rows after their preset and merges them with a personal category of the same name', async () => {
    const result = await run([
      { categoryId: 'food', type: 'expense', amount: 100 },
      { categoryId: null, categoryKey: 'food-drinks', shared: true, type: 'expense', amount: 300 },
      { categoryId: null, categoryKey: 'transportation', shared: true, type: 'expense', amount: 100 },
    ], categories, ['cash', 'team']);

    expect(result.expense.total).toBe(500);
    // "Food" the personal category has another name than the preset "Food & Drinks", so they stay apart
    const names = result.expense.items.map(item => item.name);
    expect(names).toEqual(['Food & Drinks', 'Food', 'Transportation']);
    expect(result.expense.items[0]).toMatchObject({ categoryId: null, icon: 'Utensils', color: '#EA580C', amount: 300, percentage: 60 });
  });

  it('merges a personal category and a preset that share a name, keeping the personal id, icon and color', async () => {
    const list = [...categories, { _id: 'foodDrinks', name: 'Food & Drinks', type: 'expense' as const, icon: 'Coffee', color: '#111111' }];
    const result = await run([
      { categoryId: null, categoryKey: 'food-drinks', shared: true, type: 'expense', amount: 300 },
      { categoryId: 'foodDrinks', type: 'expense', amount: 100 },
    ], list, ['cash', 'team']);

    expect(result.expense.items).toEqual([
      { categoryId: 'foodDrinks', name: 'Food & Drinks', icon: 'Coffee', color: '#111111', amount: 400, percentage: 100 },
    ]);
  });

  it('counts a shared row without a stored key as the shared Others of its type', async () => {
    const result = await run([{ categoryId: null, categoryKey: null, shared: true, type: 'income', amount: 50 }], [], ['team']);
    expect(result.income.items).toEqual([
      { categoryId: null, name: 'Others', icon: 'MoreHorizontal', color: '#4B5563', amount: 50, percentage: 100 },
    ]);
  });
});

describe('GetRunningBalanceService (US8-5)', () => {
  const service = (wallets: WalletRecord[], days: { date: string; income: number; expense: number }[], sinceStart: { income: number; expense: number }) => {
    const sumByType = vi.fn(async () => ({ ...sinceStart, count: 0 }));
    return { sumByType, running: new GetRunningBalanceService(scope(wallets), { totalsByDay: async () => days, sumByType }) };
  };

  it('works the opening balance back from the current balances, counting transactions after endDate', async () => {
    // Current 15,900 = 12,400 opening + 500 (Oct 1) + 3,000 − 700 (Oct 3) + 700 after the range.
    const { sumByType, running } = service(
      [wallet('cash', 10_900), wallet('bank', 5_000)],
      [{ date: '2026-10-01', income: 500, expense: 0 }, { date: '2026-10-03', income: 3000, expense: 700 }],
      { income: 4200, expense: 700 },
    );

    const result = await running.execute('user-1', { startDate: '2026-10-01', endDate: '2026-10-05', interval: 'daily' });

    expect(sumByType).toHaveBeenCalledWith('user-1', { start: new Date('2026-10-01T00:00:00.000Z'), walletIds: ['cash', 'bank'], sharedWalletIds: [] });
    expect(result).toEqual({
      interval: 'daily',
      openingBalance: 12400,
      closingBalance: 15200,
      points: [
        { date: '2026-10-01', balance: 12900 },
        { date: '2026-10-02', balance: 12900 },
        { date: '2026-10-03', balance: 15200 },
        { date: '2026-10-04', balance: 15200 },
        { date: '2026-10-05', balance: 15200 },
      ],
    });
  });

  it('may go negative', async () => {
    const { running } = service([wallet('cash', -50)], [{ date: '2026-10-02', income: 0, expense: 150 }], { income: 0, expense: 150 });

    const result = await running.execute('user-1', { startDate: '2026-10-01', endDate: '2026-10-02', interval: 'daily' });

    expect(result).toMatchObject({ openingBalance: 100, closingBalance: -50, points: [{ date: '2026-10-01', balance: 100 }, { date: '2026-10-02', balance: -50 }] });
  });

  it('reports weekly points at the end of each week, the last one clipped to endDate', async () => {
    const { running } = service([wallet('cash', 1000)], [{ date: '2026-10-06', income: 200, expense: 0 }], { income: 200, expense: 0 });

    const result = await running.execute('user-1', { startDate: '2026-10-01', endDate: '2026-10-15', interval: 'weekly' });

    expect(result.points).toEqual([{ date: '2026-10-04', balance: 800 }, { date: '2026-10-11', balance: 1000 }, { date: '2026-10-15', balance: 1000 }]);
  });

  it('rejects more than 400 points with fields.interval', async () => {
    const { running } = service([wallet('cash')], [], { income: 0, expense: 0 });

    await expect(running.execute('user-1', { startDate: '2025-01-01', endDate: '2026-12-31', interval: 'daily' }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR', fields: { interval: expect.any(String) } });
  });
});
