import type { TransactionRepositoryPort, TransactionInput, WalletAccess, CategoryAccess } from '@/server/shared/ports/transactions';
import type { TransactionContext, UnitOfWork } from '@/server/shared/ports/unit-of-work';
import type { WalletMembershipPort } from '@/server/shared/ports/wallet-membership';
import type { WalletRepositoryPort } from '@/server/shared/ports/wallets';
import type { UserDirectoryPort } from '@/server/shared/ports/users';
import { AppError } from '@/server/shared/kernel/AppError';
import { delta, resolveSharedCategoryKey } from './rules';

export class CreateTransactionService {
  constructor(
    private repo: TransactionRepositoryPort,
    private wallets: WalletAccess & Pick<WalletRepositoryPort, 'findById'>,
    private categories: CategoryAccess,
    private uow: UnitOfWork,
    private memberships?: WalletMembershipPort,
    private users?: UserDirectoryPort,
  ) {}

  execute(userId: string, input: TransactionInput) {
    return this.uow.run(context => this.post(userId, input, context));
  }

  /** Same write inside the caller's UnitOfWork (used by the Scheduler job). */
  async post(userId: string, input: TransactionInput, context: TransactionContext) {
    if (!input.walletId || !/^[a-f0-9]{24}$/i.test(input.walletId)) {
      throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { wallet_id: 'must be a valid ObjectId' });
    }
    const wallet = this.wallets.findById ? await this.wallets.findById(input.walletId, context) : null;
    if (!wallet) throw new AppError('NOT_FOUND', 'Wallet not found');

    if (wallet.isShared) {
      const memberships = this.memberships;
      if (!memberships) throw new AppError('FORBIDDEN', 'Only wallet members can access this wallet');
      const role = await memberships.roleOf(wallet.id, userId, context);
      if (!role) throw new AppError('FORBIDDEN', 'Only wallet members can access this wallet');

      if (input.categoryId !== undefined && input.categoryId !== null && input.categoryId !== '') {
        throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { categoryId: 'Category is not allowed for shared wallets' });
      }
      const categoryKey = resolveSharedCategoryKey(input.type, input.categoryKey);
      const tx = await this.repo.create(userId, { ...input, categoryId: null, categoryKey }, context);
      await this.wallets.adjust(tx.walletId, userId, delta(tx.type, tx.amount), context);
      if (this.users) {
        const publicUsers = await this.users.findPublicByIds([userId], context);
        const authorName = publicUsers[0]?.name ?? 'Unnamed user';
        tx.createdBy = { id: userId, name: authorName };
      }
      return tx;
    }

    if (wallet.userId !== userId) throw new AppError('NOT_FOUND', 'Wallet not found');
    if (input.categoryKey) {
      throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { categoryKey: 'Category key is only allowed for shared wallets' });
    }
    if (input.categoryId) {
      const type = /^[a-f0-9]{24}$/i.test(input.categoryId) ? await this.categories.typeOf(input.categoryId, userId, context) : null;
      if (type !== input.type) throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { categoryId: 'Referenced category does not exist or type mismatch' });
    }
    const tx = await this.repo.create(userId, input, context);
    await this.wallets.adjust(tx.walletId, userId, delta(tx.type, tx.amount), context);
    return tx;
  }
}
