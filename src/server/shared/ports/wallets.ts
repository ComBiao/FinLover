import type { TransactionContext } from './unit-of-work';

export type WalletCreateInput = { name: string; color?: string; icon?: string; isSaving?: boolean; goalAmount?: number };
export type WalletUpdateInput = Partial<Pick<WalletCreateInput, 'name' | 'color' | 'icon'>>;

export type WalletSavingInput = { isSaving: boolean; goalAmount?: number };

export interface WalletRecord {
  id: string;
  userId: string;
  name: string;
  balance: number;
  isDefault: boolean;
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
  findOwned(id: string, userId: string, context?: TransactionContext): Promise<WalletRecord | null>;
  create(userId: string, input: WalletCreateInput): Promise<WalletRecord>;
  update(id: string, userId: string, input: WalletUpdateInput): Promise<WalletRecord | null>;
  setSaving(id: string, userId: string, input: WalletSavingInput): Promise<WalletRecord | null>;
  delete(id: string, userId: string, context: TransactionContext): Promise<unknown>;
  createDefault(userId: string, context?: TransactionContext): Promise<WalletRecord>;
}

export interface WalletTransactionCleanup { removeByWallet(walletId: string, userId: string, context: TransactionContext): Promise<void> }
