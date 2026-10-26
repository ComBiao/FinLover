import type { WalletRecord, WalletRepositoryPort } from '@/server/shared/ports/wallets';
import { AppError } from '@/server/shared/kernel/AppError';

/**
 * The one place that decides which wallets a report may read (Epic 8). Today that is the caller's
 * personal wallets, the same set Home totals for walletId=all, saving wallets included. Shared
 * wallets are out of scope until Epic 7 wires them into reports: like any wallet the caller does
 * not own, or one that does not exist, asking for one is 404.
 */
export class ReportWalletScope {
  constructor(private wallets: Pick<WalletRepositoryPort, 'list'>) {}

  /** The requested wallets, or every personal wallet when none are named. */
  async resolve(userId: string, walletIds?: string[]): Promise<WalletRecord[]> {
    const personal = (await this.wallets.list(userId)).filter(wallet => !wallet.isShared);
    if (!walletIds) return personal;
    const byId = new Map(personal.map(wallet => [wallet.id, wallet]));
    return walletIds.map(id => {
      const wallet = byId.get(id);
      if (!wallet) throw new AppError('NOT_FOUND', 'Wallet not found');
      return wallet;
    });
  }
}
