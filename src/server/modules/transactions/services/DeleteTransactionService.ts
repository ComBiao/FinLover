import type { TransactionRepositoryPort, WalletAccess } from '@/server/shared/ports/transactions';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import type { WalletMembershipPort } from '@/server/shared/ports/wallet-membership';
import type { WalletRepositoryPort } from '@/server/shared/ports/wallets';
import { AppError } from '@/server/shared/kernel/AppError';
import { delta } from './rules';

export class DeleteTransactionService {
  constructor(
    private repo: TransactionRepositoryPort,
    private wallets: WalletAccess & Pick<WalletRepositoryPort, 'findById'>,
    private uow: UnitOfWork,
    private memberships?: WalletMembershipPort,
  ) {}

  execute(id: string, userId: string) {
    return this.uow.run(async context => {
      const tx = await this.repo.findById(id, context);
      if (!tx) throw new AppError('NOT_FOUND', 'Transaction not found');

      const wallet = this.wallets.findById ? await this.wallets.findById(tx.walletId, context) : null;
      if (!wallet) throw new AppError('NOT_FOUND', 'Wallet not found');

      if (wallet.isShared) {
        const memberships = this.memberships;
        if (!memberships) {
          throw new AppError('FORBIDDEN', 'Only the member of the wallet can modify this transaction');
        }
        const role = await memberships.roleOf(tx.walletId, userId, context);
        if (!role) {
          throw new AppError('FORBIDDEN', 'Only the member of the wallet can modify this transaction');
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
