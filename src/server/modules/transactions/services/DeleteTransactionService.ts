import type { TransactionRepositoryPort, WalletAccess } from '@/server/shared/ports/transactions';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { AppError } from '@/server/shared/kernel/AppError';
import { delta } from './rules';
export class DeleteTransactionService {
  constructor(private repo: TransactionRepositoryPort, private wallets: WalletAccess, private uow: UnitOfWork) {}
  execute(id: string, userId: string) {
    return this.uow.run(async context => {
      const tx = await this.repo.remove(id, userId, context);
      if (!tx) throw new AppError('NOT_FOUND', 'Transaction not found');
      await this.wallets.adjust(tx.walletId, userId, -delta(tx.type, tx.amount), context);
      return tx;
    });
  }
}
