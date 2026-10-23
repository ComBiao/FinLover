import 'server-only';
import type { WalletRepository } from './WalletRepository';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import { AppError } from '@/server/shared/kernel/AppError';

/** Temporary rollout boundary: E7-11 will wire membership-aware transactions.
 * Do not let current category/DTO adapters silently write malformed shared data.
 */
export class PersonalWalletAccess {
  constructor(private wallets: WalletRepository) {}
  async exists(id: string, userId: string, context: TransactionContext) {
    const wallet = await this.wallets.findAccessible(id, userId, context);
    if (wallet.isShared) throw new AppError('CONFLICT', 'Shared wallet transactions are not available yet');
    return true;
  }
  async adjust(id: string, userId: string, delta: number, context: TransactionContext) {
    await this.exists(id, userId, context);
    return this.wallets.adjust(id, userId, delta, context);
  }
  async findOwned(id: string, userId: string) {
    const wallet = await this.wallets.findAccessible(id, userId);
    if (wallet.isShared) throw new AppError('CONFLICT', 'Shared wallet transaction summaries are not available yet');
    return wallet;
  }
}
