import type { TransactionRepositoryPort, TransactionInput, WalletAccess, CategoryAccess } from '@/server/shared/ports/transactions';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import type { WalletMembershipPort } from '@/server/shared/ports/wallet-membership';
import type { UserDirectoryPort } from '@/server/shared/ports/users';
import { sessionOf } from '@/server/db/unit-of-work';
import Wallet from '@/server/db/models/Wallet';
import { AppError } from '@/server/shared/kernel/AppError';
import { delta, validateReferences } from './rules';

export class UpdateTransactionService {
  constructor(
    private repo: TransactionRepositoryPort,
    private wallets: WalletAccess,
    private categories: CategoryAccess,
    private uow: UnitOfWork,
    private memberships?: WalletMembershipPort,
    private users?: UserDirectoryPort,
  ) {}

  execute(id: string, userId: string, input: TransactionInput & { explicitCategory?: boolean; explicitWallet?: boolean }) {
    return this.uow.run(async context => {
      const old = await (this.repo.findById ? this.repo.findById(id, context) : this.repo.findOwned(id, userId, context));
      if (!old) throw new AppError('NOT_FOUND', 'Transaction not found');

      const wallet = await Wallet.findById(old.walletId).session(sessionOf(context) ?? null);
      if (!wallet) throw new AppError('NOT_FOUND', 'Wallet not found');

      if (wallet.isShared) {
        if (this.memberships) {
          const role = await this.memberships.roleOf(old.walletId, userId, context);
          if (!role) {
            throw new AppError('FORBIDDEN', 'Only the member of the wallet can modify this transaction');
          }
        }
        if (input.explicitWallet && input.walletId && input.walletId !== old.walletId) {
          throw new AppError('VALIDATION_ERROR', 'Cannot change wallet for a shared transaction', { walletId: 'Cannot change wallet for a shared transaction' });
        }
        if (input.categoryId !== undefined && input.categoryId !== null && input.categoryId !== '') {
          throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { categoryId: 'Category is not allowed for shared wallets' });
        }

        const next = { ...input, walletId: old.walletId, categoryId: null, updatedBy: userId };
        const tx = await this.repo.update(id, next, context);
        if (!tx) throw new AppError('NOT_FOUND', 'Transaction not found');

        await this.wallets.adjust(old.walletId, userId, delta(tx.type, tx.amount) - delta(old.type, old.amount), context);

        if (this.users) {
          const userIds = Array.from(new Set([old.userId, userId]));
          const publicUsers = await this.users.findPublicByIds(userIds, context);
          const userMap = new Map(publicUsers.map(u => [u.id, u.name]));

          const authorName = userMap.get(old.userId) ?? 'Deleted user';
          tx.createdBy = { id: old.userId, name: authorName };
          if (userId !== old.userId) {
            const editorName = userMap.get(userId) ?? 'Deleted user';
            tx.editedBy = { id: userId, name: editorName };
          }
        }
        return tx;
      }

      // Personal wallet
      if (old.userId !== userId) throw new AppError('NOT_FOUND', 'Transaction not found');
      const next = { ...input, walletId: input.walletId ?? old.walletId };
      await validateReferences(next, userId, this.wallets, this.categories, context);
      const tx = await this.repo.update(id, next, context);
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
