import type { TransactionRepositoryPort, TransactionInput, WalletAccess, CategoryAccess } from '@/server/shared/ports/transactions';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import type { WalletMembershipPort } from '@/server/shared/ports/wallet-membership';
import type { WalletRepositoryPort } from '@/server/shared/ports/wallets';
import type { UserDirectoryPort } from '@/server/shared/ports/users';
import { AppError } from '@/server/shared/kernel/AppError';
import { delta, validateReferences } from './rules';

export class UpdateTransactionService {
  constructor(
    private repo: TransactionRepositoryPort,
    private wallets: WalletAccess & Pick<WalletRepositoryPort, 'findOwned' | 'findById'>,
    private categories: CategoryAccess,
    private uow: UnitOfWork,
    private memberships?: WalletMembershipPort,
    private users?: UserDirectoryPort,
  ) {}

  execute(id: string, userId: string, input: TransactionInput & { explicitWallet?: boolean }) {
    return this.uow.run(async context => {
      const old = await this.repo.findById(id, context);
      if (!old) throw new AppError('NOT_FOUND', 'Transaction not found');

      const wallet = this.wallets.findById ? await this.wallets.findById(old.walletId, context) : null;
      if (!wallet) throw new AppError('NOT_FOUND', 'Wallet not found');

      if (wallet.isShared) {
        const memberships = this.memberships;
        if (!memberships) {
          throw new AppError('FORBIDDEN', 'Only the member of the wallet can modify this transaction');
        }
        const role = await memberships.roleOf(old.walletId, userId, context);
        if (!role) {
          throw new AppError('FORBIDDEN', 'Only the member of the wallet can modify this transaction');
        }
        if (input.explicitWallet && input.walletId && input.walletId !== old.walletId) {
          throw new AppError('VALIDATION_ERROR', 'Cannot change wallet for a shared transaction', { walletId: 'Cannot change wallet for a shared transaction' });
        }
        if (input.categoryId !== undefined && input.categoryId !== null && input.categoryId !== '') {
          throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { categoryId: 'Category is not allowed for shared wallets' });
        }

        const next = { ...input, walletId: old.walletId, categoryId: null, updatedBy: userId };
        const tx = await this.repo.update(id, next, context, userId);
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
      const targetWalletId = input.walletId ?? old.walletId;
      if (targetWalletId !== old.walletId) {
        const targetWallet = this.wallets.findOwned ? await this.wallets.findOwned(targetWalletId, userId, context) : null;
        if (!targetWallet || targetWallet.isShared) {
          throw new AppError('VALIDATION_ERROR', 'Cannot move transaction between personal and shared wallets', { walletId: 'Cannot move transaction between personal and shared wallets' });
        }
      }
      const next = { ...input, walletId: targetWalletId };
      await validateReferences(next, userId, this.wallets, this.categories, context);
      const tx = await this.repo.update(id, next, context, userId);
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
