import type { TransactionRepositoryPort, TransactionInput, WalletAccess, CategoryAccess } from '@/server/shared/ports/transactions';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { delta, validateReferences } from './rules';
export class CreateTransactionService {
  constructor(private repo: TransactionRepositoryPort, private wallets: WalletAccess, private categories: CategoryAccess, private uow: UnitOfWork) {}
  execute(userId: string, input: TransactionInput) {
    return this.uow.run(async context => {
      await validateReferences(input, userId, this.wallets, this.categories, context);
      const tx = await this.repo.create(userId, input, context);
      await this.wallets.adjust(tx.walletId, userId, delta(tx.type, tx.amount), context);
      return tx;
    });
  }
}
