import type { TransactionContext } from './unit-of-work';

/** Mutations require the caller to hold the shared wallet lock in UnitOfWork. */
export interface WalletMembersPort {
  list(walletId: string, context: TransactionContext): Promise<{ userId: string; status: 'pending' | 'accepted' }[]>;
  remove(walletId: string, userId: string, context: TransactionContext): Promise<boolean>;
  transfer(walletId: string, ownerId: string, nextOwnerId: string, context: TransactionContext): Promise<void>;
}
