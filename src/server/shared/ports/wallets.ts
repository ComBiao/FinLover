import type { TransactionContext } from './unit-of-work';

export type WalletCreateInput = { name: string; color?: string; isSaving?: boolean; goalAmount?: number;};
export type WalletUpdateInput = Partial<WalletCreateInput>;

export interface WalletRecord {
  id: string;
  userId: string;
  name: string;
  balance: number;
  isDefault: boolean;
  color?: string;
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
  delete(id: string, userId: string, context: TransactionContext): Promise<unknown>;
}
