import type { TransactionRepositoryPort, WalletAccess } from '@/server/shared/ports/transactions';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import type { WalletMembershipPort } from '@/server/shared/ports/wallet-membership';
import { sessionOf } from '@/server/db/unit-of-work';
import Wallet from '@/server/db/models/Wallet';
import { AppError } from '@/server/shared/kernel/AppError';
import { delta } from './rules';

export class DeleteTransactionService {
  constructor(
    private repo: TransactionRepositoryPort,
    private wallets: WalletAccess,
    private uow: UnitOfWork,
    private memberships?: WalletMembershipPort,
  ) {}

  execute(id: string, userId: string) {
    return this.uow.run(async context => {
      const tx = await (this.repo.findById ? this.repo.findById(id, context) : this.repo.findOwned(id, userId, context));
      if (!tx) throw new AppError('NOT_FOUND', 'Transaction not found');

      const wallet = await Wallet.findById(tx.walletId).session(sessionOf(context) ?? null);
      if (!wallet) throw new AppError('NOT_FOUND', 'Wallet not found');

      if (wallet.isShared) {
        if (this.memberships) {
          const role = await this.memberships.roleOf(tx.walletId, userId, context);
          if (!role) {
            throw new AppError('FORBIDDEN', 'Only the member of the wallet can modify this transaction');
          }
        }
        await this.wallets.adjust(tx.walletId, userId, -delta(tx.type, tx.amount), context);
        await this.repo.remove(id, context);
        return tx;
      }

      // Personal wallet
      if (tx.userId !== userId) throw new AppError('NOT_FOUND', 'Transaction not found');
      await this.wallets.adjust(tx.walletId, userId, -delta(tx.type, tx.amount), context);
      await this.repo.remove(id, context);
      return tx;
    });
  }
}
