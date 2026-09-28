import type { TransactionContext } from './unit-of-work';

export type WalletInput = { name?: string; color?: string; isSaving?: boolean; goalAmount?: number; hideBalance?: boolean };

export interface WalletRecord {
  id: string;
  userId: string;
  name: string;
  balance: number;
  isDefault: boolean;
  color?: string;
  isSaving: boolean;
  goalAmount?: number;
  hideBalance: boolean;
  [key: string]: unknown;
}

export interface WalletRepositoryPort {
  list(userId: string, context?: TransactionContext): Promise<WalletRecord[]>;
  findOwned(id: string, userId: string, context?: TransactionContext): Promise<WalletRecord | null>;
  create(userId: string, input: WalletInput): Promise<unknown>;
  update(id: string, userId: string, input: WalletInput): Promise<unknown>;
  delete(id: string, userId: string, context: TransactionContext): Promise<unknown>;
}
