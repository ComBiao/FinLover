import { describe, expect, it, vi } from 'vitest';
import type { CategoryRecord } from '@/server/shared/ports/categories';
import type { WalletRecord } from '@/server/shared/ports/wallets';
import { AppError } from '@/server/shared/kernel/AppError';
import { GetTransactionSummaryService } from '../services/GetTransactionSummaryService';

const CATEGORIES: Record<string, CategoryRecord> = {
  food: { id: 'food', name: 'Food & Drinks', type: 'expense', isSystem: true },
  othersExpense: { id: 'othersExpense', name: 'Others', type: 'expense', isSystem: true },
  myOthers: { id: 'myOthers', name: 'Others', type: 'expense', isSystem: false },
};

function service(totals = { income: 60300, expense: 7495, count: 12 }) {
  const sumByType = vi.fn(async () => totals);
  const findWallet = vi.fn(async (id: string) => (id === 'mine' ? ({ id } as WalletRecord) : null));
  const findCategory = vi.fn(async (id: string) => CATEGORIES[id] ?? null);
  return {
    sumByType,
    summary: new GetTransactionSummaryService({ sumByType }, { findOwned: findWallet }, { findOwned: findCategory }),
  };
}

describe('GetTransactionSummaryService (#156)', () => {
  it('returns income, expense and net for the inclusive date range', async () => {
    const { sumByType, summary } = service();

    const result = await summary.execute('user-1', { from: '2026-10-01', to: '2026-10-31' });

    expect(result).toEqual({ totalIncome: 60300, totalExpense: 7495, netBalance: 52805 });
    expect(sumByType).toHaveBeenCalledWith('user-1', {
      start: new Date('2026-10-01T00:00:00.000Z'),
      end: new Date('2026-11-01T00:00:00.000Z'),
      walletId: undefined, type: undefined, categoryIds: undefined, search: undefined,
    });
  });

  it('passes the wallet, type, category and search filters through', async () => {
    const { sumByType, summary } = service();

    await summary.execute('user-1', { from: '2026-01-01', to: '2026-12-31', walletId: 'mine', categoryId: 'food', type: 'expense', search: 'lunch' });

    expect(sumByType).toHaveBeenCalledWith('user-1', expect.objectContaining({
      end: new Date('2027-01-01T00:00:00.000Z'), walletId: 'mine', type: 'expense', categoryIds: ['food'], search: 'lunch',
    }));
  });

  it("makes the seeded Others also match its type's transactions without a category", async () => {
    const { sumByType, summary } = service();

    await summary.execute('user-1', { from: '2026-10-01', to: '2026-10-01', categoryId: 'othersExpense' });

    expect(sumByType).toHaveBeenCalledWith('user-1', expect.objectContaining({ categoryIds: ['othersExpense', null], type: 'expense' }));
  });

  it('treats a custom category named Others like any other category', async () => {
    const { sumByType, summary } = service();

    await summary.execute('user-1', { from: '2026-10-01', to: '2026-10-01', categoryId: 'myOthers' });

    expect(sumByType).toHaveBeenCalledWith('user-1', expect.objectContaining({ categoryIds: ['myOthers'], type: undefined }));
  });

  it('returns zeros without querying when Others is combined with the other type', async () => {
    const { sumByType, summary } = service();

    const result = await summary.execute('user-1', { from: '2026-10-01', to: '2026-10-31', categoryId: 'othersExpense', type: 'income' });

    expect(result).toEqual({ totalIncome: 0, totalExpense: 0, netBalance: 0 });
    expect(sumByType).not.toHaveBeenCalled();
  });

  it.each([
    ['wallet', { walletId: 'theirs' }, 'Wallet not found'],
    ['category', { categoryId: 'theirs' }, 'Category not found'],
  ])("rejects a %s the user does not own as not found", async (_name, filter, message) => {
    const { sumByType, summary } = service();

    await expect(summary.execute('user-1', { from: '2026-10-01', to: '2026-10-31', ...filter })).rejects.toMatchObject(new AppError('NOT_FOUND', message));
    expect(sumByType).not.toHaveBeenCalled();
  });
});
