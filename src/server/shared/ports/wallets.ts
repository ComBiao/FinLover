import type { TransactionContext } from './unit-of-work';

export type WalletCreateInput = { name: string; color?: string; icon?: string; isSaving?: boolean; goalAmount?: number; isShared?: boolean };
export type WalletUpdateInput = Partial<Pick<WalletCreateInput, 'name' | 'color' | 'icon'>>;

export type WalletSavingInput = { isSaving: boolean; goalAmount?: number };

export interface WalletRecord {
  id: string;
  userId: string;
  name: string;
  balance: number;
  isDefault: boolean;
  isShared?: boolean;
  color?: string;
  icon?: string;
  isSaving: boolean;
  goalAmount?: number;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}

export interface WalletRepositoryPort {
  list(userId: string, context?: TransactionContext): Promise<WalletRecord[]>;
  findById?(id: string, context?: TransactionContext): Promise<WalletRecord | null>;
  findOwned(id: string, userId: string, context?: TransactionContext): Promise<WalletRecord | null>;
  create(userId: string, input: WalletCreateInput, context?: TransactionContext): Promise<WalletRecord>;
  update(id: string, userId: string, input: WalletUpdateInput): Promise<WalletRecord | null>;
  setSaving(id: string, userId: string, input: WalletSavingInput): Promise<WalletRecord | null>;
  delete(id: string, userId: string, context: TransactionContext): Promise<unknown>;
  createDefault(userId: string, context?: TransactionContext): Promise<WalletRecord>;
}

export interface WalletTransactionCleanup { removeByWallet(walletId: string, userId: string, context: TransactionContext): Promise<void> }


/** Reads used by wallet cards; owned-only methods remain separate. */
export interface WalletReaderPort {
  listAccessible(userId: string): Promise<WalletRecord[]>;
  findAccessible(id: string, userId: string, context?: TransactionContext): Promise<WalletRecord>;
  findByIds(ids: string[], context?: TransactionContext): Promise<WalletRecord[]>;
  findById?(id: string, context?: TransactionContext): Promise<WalletRecord | null>;
}
