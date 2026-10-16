import { describe, expect, it, vi } from 'vitest';
import type { WalletRecord } from '@/server/shared/ports/wallets';
import type { TransactionRecord } from '@/server/shared/ports/transactions';
import { AppError } from '@/server/shared/kernel/AppError';
import { GetHomeSummaryService } from '../services/GetHomeSummaryService';

const wallet = (id: string, balance: number, overrides: Partial<WalletRecord> = {}): WalletRecord => ({
  id, userId: 'user-1', name: id, balance, isDefault: false, isSaving: false,
  createdAt: new Date(0), updatedAt: new Date(0), ...overrides,
});

const tx = (walletId: string, type: TransactionRecord['type'], amount: number, categoryId: string | null = null): TransactionRecord => ({
  id: `${walletId}-${type}-${amount}`, userId: 'user-1', walletId, type, amount, categoryId, date: new Date('2026-10-05T00:00:00.000Z'), title: 't',
});

type CategoryDoc = { _id: string; name: string; type: 'income' | 'expense'; isSystem?: boolean; icon?: string; color?: string };

function service(wallets: WalletRecord[], transactions: TransactionRecord[] = [], categories: CategoryDoc[] = []) {
  const list = vi.fn(async () => wallets);
  const findByDateRange = vi.fn(async () => transactions);
  const listCategories = vi.fn(async () => categories);
  return {
    list,
    findByDateRange,
    listCategories,
    summary: new GetHomeSummaryService({ list }, { findByDateRange }, { list: listCategories }, () => new Date('2026-09-30T17:30:00.000Z'), () => 'Asia/Bangkok'),
  };
}

describe('GetHomeSummaryService — total balance (#89)', () => {
  it('sums every owned wallet for "all"', async () => {
    const { list, summary } = service([wallet('a', 1200.5), wallet('b', -200), wallet('c', 0)]);

    const result = await summary.execute('user-1', { month: '2026-10', walletId: 'all' });

    expect(list).toHaveBeenCalledWith('user-1');
    expect(result.month).toBe('2026-10');
    expect(result.walletId).toBe('all');
    expect(result.balance).toEqual({ hasWallets: true, totalBalance: 1000.5, savingGoal: null });
  });

  it('scopes the balance to one owned wallet', async () => {
    const { summary } = service([wallet('a', 1200.5), wallet('b', 300)]);

    const result = await summary.execute('user-1', { month: '2026-10', walletId: 'b' });

    expect(result.balance).toEqual({ hasWallets: true, totalBalance: 300, savingGoal: null });
  });

  it('returns 0 instead of failing when the user has no wallets', async () => {
    const { summary } = service([]);

    const result = await summary.execute('user-1', { walletId: 'all' });

    expect(result.balance).toEqual({ hasWallets: false, totalBalance: 0, savingGoal: null });
  });

  it('defaults to the current month in the configured timezone', async () => {
    const { summary } = service([]);

    expect((await summary.execute('user-1', { walletId: 'all' })).month).toBe('2026-10');
  });

  it('rejects a wallet the user does not own as not found', async () => {
    const { summary } = service([wallet('a', 1)]);

    await expect(summary.execute('user-1', { walletId: 'someone-else' })).rejects.toMatchObject(new AppError('NOT_FOUND', 'Wallet not found'));
  });
});

describe('GetHomeSummaryService — income, expense and net (#90, #91, #92)', () => {
  const wallets = [wallet('a', 0), wallet('b', 0)];
  const transactions = [tx('a', 'income', 30000), tx('a', 'expense', 150.25), tx('b', 'expense', 500), tx('b', 'income', 300)];

  it("totals the month's income and expense across every wallet and reads only that month", async () => {
    const { findByDateRange, summary } = service(wallets, transactions);

    const result = await summary.execute('user-1', { month: '2026-10', walletId: 'all' });

    expect(findByDateRange).toHaveBeenCalledWith('user-1', new Date('2026-10-01T00:00:00.000Z'), new Date('2026-11-01T00:00:00.000Z'));
    expect(result).toMatchObject({ income: 30300, expense: 650.25, net: { net: 29649.75, status: 'surplus' } });
  });

  it('only counts transactions of the selected wallet', async () => {
    const { summary } = service(wallets, transactions);

    const result = await summary.execute('user-1', { month: '2026-10', walletId: 'b' });

    expect(result).toMatchObject({ income: 300, expense: 500, net: { net: -200, status: 'overspending' } });
  });

  it('reports zeros and an even net for an empty month', async () => {
    const { summary } = service(wallets);

    const result = await summary.execute('user-1', { month: '2030-01', walletId: 'all' });

    expect(result).toMatchObject({ income: 0, expense: 0, net: { net: 0, status: 'even' } });
  });
});

describe('GetHomeSummaryService — saving goal progress (#81)', () => {
  const emergency = wallet('e', 12400, { name: 'Emergency fund', isSaving: true, goalAmount: 20000 });

  it("embeds the selected saving wallet's progress in the balance", async () => {
    const { summary } = service([wallet('a', 500), emergency]);

    const result = await summary.execute('user-1', { month: '2026-10', walletId: 'e' });

    expect(result.balance.savingGoal).toEqual({
      walletId: 'e', walletName: 'Emergency fund', goal: 20000, current: 12400, percent: 62, remaining: 7600, reached: false,
    });
  });

  it.each([
    ['over the goal', 25000, 100, 0, true],
    ['exactly the goal', 20000, 100, 0, true],
    ['just short of the goal', 19999, 99, 1, false],
    ['a negative balance', -100, 0, 20100, false],
  ])('clamps progress for %s', async (_name, balance, percent, remaining, reached) => {
    const { summary } = service([{ ...emergency, balance }]);

    const { savingGoal } = (await summary.execute('user-1', { walletId: 'e' })).balance;

    expect(savingGoal).toMatchObject({ percent, remaining, reached });
  });

  it.each([
    ['every wallet is selected', [emergency], 'all'],
    ['the wallet is not a saving wallet', [wallet('a', 500)], 'a'],
    ['the saving wallet has no goal', [wallet('s', 500, { isSaving: true })], 's'],
  ])('is null when %s', async (_name, wallets, walletId) => {
    const { summary } = service(wallets);

    expect((await summary.execute('user-1', { walletId })).balance.savingGoal).toBeNull();
  });
});

describe('GetHomeSummaryService — top categories (#93)', () => {
  const categories: CategoryDoc[] = [
    { _id: 'food', name: 'Food & Drinks', type: 'expense', isSystem: true, icon: 'Utensils', color: '#F97316' },
    { _id: 'travel', name: 'Travel', type: 'expense', isSystem: true, icon: 'Plane', color: '#0EA5E9' },
    { _id: 'bills', name: 'Bills', type: 'expense', isSystem: true, icon: 'Receipt', color: '#EAB308' },
    { _id: 'others-exp', name: 'Others', type: 'expense', isSystem: true, icon: 'MoreHorizontal', color: '#4B5563' },
    { _id: 'salary', name: 'Salary', type: 'income', isSystem: true, icon: 'Wallet', color: '#22C55E' },
  ];
  const wallets = [wallet('a', 0), wallet('b', 0)];

  it('ranks the top three expense categories by amount, leaving out income', async () => {
    const { listCategories, summary } = service(wallets, [
      tx('a', 'expense', 100, 'food'), tx('a', 'expense', 250, 'food'), tx('b', 'expense', 300, 'travel'),
      tx('a', 'expense', 20, 'bills'), tx('a', 'expense', 50, 'others-exp'), tx('a', 'income', 99999, 'salary'),
    ], categories);

    const { topCategories } = await summary.execute('user-1', { month: '2026-10', walletId: 'all' });

    expect(listCategories).toHaveBeenCalledWith('user-1');
    expect(topCategories).toEqual([
      { rank: 1, categoryId: 'food', name: 'Food & Drinks', icon: 'Utensils', color: '#F97316', amount: 350 },
      { rank: 2, categoryId: 'travel', name: 'Travel', icon: 'Plane', color: '#0EA5E9', amount: 300 },
      { rank: 3, categoryId: 'others-exp', name: 'Others', icon: 'MoreHorizontal', color: '#4B5563', amount: 50 },
    ]);
  });

  it('counts expenses without a category toward the seeded expense Others', async () => {
    const { summary } = service(wallets, [tx('a', 'expense', 40), tx('a', 'expense', 60, 'others-exp'), tx('a', 'expense', 70, 'food')], categories);

    const { topCategories } = await summary.execute('user-1', { walletId: 'all' });

    expect(topCategories.map(({ categoryId, amount }) => [categoryId, amount])).toEqual([['others-exp', 100], ['food', 70]]);
  });

  it('keeps category-less expenses as an Others row without an id when the seeded one is gone', async () => {
    const { summary } = service(wallets, [tx('a', 'expense', 40)], categories.filter(c => c._id !== 'others-exp'));

    const { topCategories } = await summary.execute('user-1', { walletId: 'all' });

    expect(topCategories).toEqual([{ rank: 1, categoryId: null, name: 'Others', icon: null, color: null, amount: 40 }]);
  });

  it('breaks ties by name and only counts the selected wallet', async () => {
    const { summary } = service(wallets, [tx('a', 'expense', 10, 'travel'), tx('a', 'expense', 10, 'bills'), tx('b', 'expense', 500, 'food')], categories);

    const { topCategories } = await summary.execute('user-1', { walletId: 'a' });

    expect(topCategories.map(entry => entry.name)).toEqual(['Bills', 'Travel']);
  });

  it('is empty for a month without expenses', async () => {
    const { summary } = service(wallets, [tx('a', 'income', 100, 'salary')], categories);

    expect((await summary.execute('user-1', { walletId: 'all' })).topCategories).toEqual([]);
  });
});
