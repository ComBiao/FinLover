import type { WalletReaderPort, WalletRecord, WalletRepositoryPort } from '@/server/shared/ports/wallets';
import { AppError } from '@/server/shared/kernel/AppError';

/**
 * The one place that decides which wallets a report may read (Epic 8). Without `walletIds` that is the
 * caller's personal wallets, the same set Home totals for walletId=all, saving wallets included.
 * Naming wallets also allows a shared wallet the caller owns or has accepted membership of; a wallet
 * the caller cannot reach (someone else's, a pending invitation, or one that does not exist) is 404.
 */
export class ReportWalletScope {
  constructor(private wallets: Pick<WalletRepositoryPort, 'list'> & Pick<WalletReaderPort, 'listAccessible'>) {}

  /** The requested wallets, or every personal wallet when none are named. */
  async resolve(userId: string, walletIds?: string[]): Promise<WalletRecord[]> {
    if (!walletIds) return (await this.wallets.list(userId)).filter(wallet => !wallet.isShared);
    const reachable = new Map((await this.wallets.listAccessible(userId)).map(wallet => [wallet.id, wallet]));
    return walletIds.map(id => {
      const wallet = reachable.get(id);
      if (!wallet) throw new AppError('NOT_FOUND', 'Wallet not found');
      return wallet;
    });
  }
}

/** Splits resolved wallets the way the transaction queries want them: own personal wallets vs shared wallets. */
export function walletFilterOf(wallets: WalletRecord[]) {
  return {
    walletIds: wallets.filter(wallet => !wallet.isShared).map(wallet => wallet.id),
    sharedWalletIds: wallets.filter(wallet => wallet.isShared).map(wallet => wallet.id),
  };
}
