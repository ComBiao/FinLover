import { describe, expect, it, vi } from 'vitest';
import type { WalletRecord } from '@/server/shared/ports/wallets';
import { AppError } from '@/server/shared/kernel/AppError';
import { GetHomeSummaryService } from '../services/GetHomeSummaryService';

const wallet = (id: string, balance: number, overrides: Partial<WalletRecord> = {}): WalletRecord => ({
  id, userId: 'user-1', name: id, balance, isDefault: false, isSaving: false,
  createdAt: new Date(0), updatedAt: new Date(0), ...overrides,
});

function service(wallets: WalletRecord[]) {
  const list = vi.fn(async () => wallets);
  return { list, summary: new GetHomeSummaryService({ list }, () => new Date('2026-09-30T17:30:00.000Z'), () => 'Asia/Bangkok') };
}

describe('GetHomeSummaryService — total balance (#89)', () => {
  it('sums every owned wallet for "all"', async () => {
    const { list, summary } = service([wallet('a', 1200.5), wallet('b', -200), wallet('c', 0)]);

    const result = await summary.execute('user-1', { month: '2026-10', walletId: 'all' });

    expect(list).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ month: '2026-10', walletId: 'all', balance: { hasWallets: true, totalBalance: 1000.5 } });
  });

  it('scopes the balance to one owned wallet', async () => {
    const { summary } = service([wallet('a', 1200.5), wallet('b', 300)]);

    const result = await summary.execute('user-1', { month: '2026-10', walletId: 'b' });

    expect(result.balance).toEqual({ hasWallets: true, totalBalance: 300 });
  });

  it('returns 0 instead of failing when the user has no wallets', async () => {
    const { summary } = service([]);

    const result = await summary.execute('user-1', { walletId: 'all' });

    expect(result.balance).toEqual({ hasWallets: false, totalBalance: 0 });
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
