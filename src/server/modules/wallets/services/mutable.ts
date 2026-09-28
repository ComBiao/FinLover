import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import type { WalletRepositoryPort } from '@/server/shared/ports/wallets';
import { AppError } from '@/server/shared/kernel/AppError';
export async function mutable(repo: WalletRepositoryPort, id: string, userId: string, context?: TransactionContext) {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw new AppError('VALIDATION_ERROR', 'Invalid wallet ID', {});
  const wallet = await repo.findOwned(id, userId, context);
  if (!wallet) throw new AppError('NOT_FOUND', 'Wallet not found');
  return wallet;
}
