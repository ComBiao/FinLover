import type { TransactionInput, WalletAccess, CategoryAccess } from '@/server/shared/ports/transactions';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import { AppError } from '@/server/shared/kernel/AppError';
import { SHARED_CATEGORY_PRESETS, defaultSharedCategoryKey } from '@/shared/contracts';
export const delta = (type: string, amount: number) => type === 'income' ? amount : -amount;
export async function validateReferences(input: TransactionInput, userId: string, wallets: WalletAccess, categories: CategoryAccess, context: TransactionContext) {
  if (!input.walletId || !/^[a-f0-9]{24}$/i.test(input.walletId)) throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { wallet_id: 'must be a valid ObjectId' });
  if (!await wallets.exists(input.walletId, userId, context)) throw new AppError('NOT_FOUND', 'Wallet not found');
  if (input.categoryId) {
    const type = /^[a-f0-9]{24}$/i.test(input.categoryId) ? await categories.typeOf(input.categoryId, userId, context) : null;
    if (type !== input.type) throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { categoryId: 'Referenced category does not exist or type mismatch' });
  }
}

/**
 * Shared wallets pick from the fixed presets by key. Omitted keeps the row's current key
 * (when it still fits the type), null or empty resets to the type's "Others", and a key that
 * is unknown or belongs to the other type is rejected.
 */
export function resolveSharedCategoryKey(type: 'income' | 'expense', requested: string | null | undefined, current?: string | null): string {
  if (requested === undefined) {
    const kept = SHARED_CATEGORY_PRESETS.find(preset => preset.key === current);
    return kept && kept.type === type ? kept.key : defaultSharedCategoryKey(type);
  }
  if (requested === null || requested === '') return defaultSharedCategoryKey(type);
  const preset = SHARED_CATEGORY_PRESETS.find(candidate => candidate.key === requested);
  if (!preset || preset.type !== type) {
    throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { categoryKey: 'Category does not exist or does not match the transaction type' });
  }
  return preset.key;
}
