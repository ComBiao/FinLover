import type { TransactionContext } from './unit-of-work';
export interface TransactionInput { walletId?: string; categoryId?: string | null; type: 'income' | 'expense'; amount: number; date: Date; title: string; note?: string; updatedBy?: string }
export interface TransactionRecord extends TransactionInput {
  id: string;
  walletId: string;
  userId: string;
  updatedBy?: string;
  createdBy?: { id: string; name: string };
  editedBy?: { id: string; name: string };
}
export interface TransactionRepositoryPort {
  findByDateRange(userId: string, start: Date, end: Date, search?: string): Promise<TransactionRecord[]>;
  findById?(id: string, context: TransactionContext): Promise<TransactionRecord | null>;
  findOwned(id: string, userId: string, context: TransactionContext): Promise<TransactionRecord | null>;
  create(userId: string, input: TransactionInput, context: TransactionContext): Promise<TransactionRecord>;
  update(id: string, input: TransactionInput, context: TransactionContext): Promise<TransactionRecord | null>;
  update(id: string, userId: string, input: TransactionInput, context: TransactionContext): Promise<TransactionRecord | null>;
  remove(id: string, context: TransactionContext): Promise<TransactionRecord | null>;
  remove(id: string, userId: string, context: TransactionContext): Promise<TransactionRecord | null>;
}
/** Filters for a totals-only read; dates are UTC-midnight bounds, `end` exclusive. */
export interface TransactionSummaryFilter {
  start: Date;
  end: Date;
  walletId?: string;
  type?: 'income' | 'expense';
  /** Matches any of these; `null` matches transactions without a category. */
  categoryIds?: (string | null)[];
  search?: string;
}
export interface TransactionSummaryReader { sumByType(userId: string, filter: TransactionSummaryFilter): Promise<{ income: number; expense: number }> }
export interface WalletAccess { exists(id: string, userId: string, context: TransactionContext): Promise<boolean>; adjust(id: string, userId: string, delta: number, context: TransactionContext): Promise<void> }

export interface CategoryAccess { typeOf(id: string, userId: string, context: TransactionContext): Promise<string | null> }
