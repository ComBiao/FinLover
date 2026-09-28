import type { TransactionInput, WalletAccess, CategoryAccess } from '@/server/shared/ports/transactions';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import { AppError } from '@/server/shared/kernel/AppError';
export const delta = (type: string, amount: number) => type === 'income' ? amount : -amount;
export async function validateReferences(input: TransactionInput, userId: string, wallets: WalletAccess, categories: CategoryAccess, context: TransactionContext) {
  if (!input.walletId || !/^[a-f0-9]{24}$/i.test(input.walletId)) throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { wallet_id: 'must be a valid ObjectId' });
  if (!await wallets.exists(input.walletId, userId, context)) throw new AppError('NOT_FOUND', 'Wallet not found');
  if (input.categoryId) {
    const type = /^[a-f0-9]{24}$/i.test(input.categoryId) ? await categories.typeOf(input.categoryId, userId, context) : null;
    if (type !== input.type) throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { categoryId: 'Referenced category does not exist or type mismatch' });
  }
}
