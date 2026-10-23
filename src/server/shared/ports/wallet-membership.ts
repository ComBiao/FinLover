import type { WalletRole } from '@/shared/contracts';
import type { TransactionContext } from './unit-of-work';

export interface WalletMembershipPort {
  /** Missing wallet or no accepted membership returns null; owner is not a member row. */
  roleOf(walletId: string, userId: string, context?: TransactionContext): Promise<WalletRole | null>;
  listAccessible(userId: string, context?: TransactionContext): Promise<string[]>;
  acceptedMembers(walletIds: string[], context?: TransactionContext): Promise<{ walletId: string; userId: string }[]>;
  /** Serializes membership changes with wallet deletion and future shared transaction writes. */
  lockWallet(walletId: string, context: TransactionContext): Promise<{ userId: string; isShared: boolean }>;
}

export interface WalletInvitationRecord {
  id: string; walletId: string; userId: string; invitedBy: string;
  status: 'pending' | 'accepted'; createdAt: Date;
}
export interface WalletInvitationRepositoryPort {
  create(walletId: string, userId: string, invitedBy: string, context: TransactionContext): Promise<WalletInvitationRecord>;
  find(id: string, context: TransactionContext): Promise<WalletInvitationRecord | null>;
  listPending(userId: string): Promise<WalletInvitationRecord[]>;
  accept(id: string, userId: string, context: TransactionContext): Promise<boolean>;
  decline(id: string, userId: string, context: TransactionContext): Promise<boolean>;
}
