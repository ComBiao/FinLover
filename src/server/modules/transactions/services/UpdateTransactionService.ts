import type { TransactionRepositoryPort, TransactionInput, WalletAccess, CategoryAccess } from '@/server/shared/ports/transactions';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { AppError } from '@/server/shared/kernel/AppError';
import { delta, validateReferences } from './rules';
export class UpdateTransactionService {
  constructor(private repo: TransactionRepositoryPort, private wallets: WalletAccess, private categories: CategoryAccess, private uow: UnitOfWork) {}
  execute(id: string, userId: string, input: TransactionInput) {
    return this.uow.run(async context => {
      const old = await this.repo.findOwned(id, userId, context);
      if (!old) throw new AppError('NOT_FOUND', 'Transaction not found');
      const next = { ...input, walletId: input.walletId ?? old.walletId };
      await validateReferences(next, userId, this.wallets, this.categories, context);
      const tx = await this.repo.update(id, userId, next, context);
      if (!tx) throw new AppError('NOT_FOUND', 'Transaction not found');
      if (old.walletId === tx.walletId) {
        await this.wallets.adjust(tx.walletId, userId, delta(tx.type, tx.amount) - delta(old.type, old.amount), context);
      } else {
        await this.wallets.adjust(old.walletId, userId, -delta(old.type, old.amount), context);
        await this.wallets.adjust(tx.walletId, userId, delta(tx.type, tx.amount), context);
      }
      return tx;
    });
  }
}
