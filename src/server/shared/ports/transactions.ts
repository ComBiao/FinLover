import type { TransactionContext } from './unit-of-work';
import type { WalletRecord } from './wallets';

export interface TransactionInput { walletId?: string; categoryId?: string | null; categoryKey?: string | null; type: 'income' | 'expense'; amount: number; date: Date; title: string; note?: string; updatedBy?: string }
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
  findByWalletAndDateRange?(walletId: string, start: Date, end: Date): Promise<TransactionRecord[]>;
  findById(id: string, context: TransactionContext): Promise<TransactionRecord | null>;
  findOwned(id: string, userId: string, context: TransactionContext): Promise<TransactionRecord | null>;
  create(userId: string, input: TransactionInput, context: TransactionContext): Promise<TransactionRecord>;
  update(id: string, input: TransactionInput, context: TransactionContext, actorUserId?: string): Promise<TransactionRecord | null>;
  update(id: string, userId: string, input: TransactionInput, context: TransactionContext): Promise<TransactionRecord | null>;
  remove(id: string, context: TransactionContext): Promise<TransactionRecord | null>;
  remove(id: string, userId: string, context: TransactionContext): Promise<TransactionRecord | null>;
}
/** Filters for a totals-only read; dates are UTC-midnight bounds, `end` exclusive (omitted = no upper bound). */
export interface TransactionSummaryFilter {
  start: Date;
  end?: Date;
  walletId?: string;
  /** Any of these personal wallets; ignored when `walletId` is set. */
  walletIds?: string[];
  type?: 'income' | 'expense';
  /** Matches any of these; `null` matches transactions without a category. */
  categoryIds?: (string | null)[];
  search?: string;
}
export interface TransactionSummaryReader { sumByType(userId: string, filter: TransactionSummaryFilter): Promise<{ income: number; expense: number; count: number }> }
/** Report filters: UTC-midnight bounds with `end` exclusive, scoped to these personal wallets. */
export interface TransactionReportFilter { start: Date; end: Date; walletIds: string[] }
export interface TransactionReportReader {
  /** Income and expense per UTC calendar day (YYYY-MM-DD) that has transactions, oldest first. */
  totalsByDay(userId: string, filter: TransactionReportFilter): Promise<{ date: string; income: number; expense: number }[]>;
  /** Amount per category and type; `categoryId` is null for transactions without a category. */
  totalsByCategory(userId: string, filter: TransactionReportFilter): Promise<{ categoryId: string | null; type: 'income' | 'expense'; amount: number }[]>;
}
export interface WalletAccess {
  exists(id: string, userId: string, context: TransactionContext): Promise<boolean>;
  /** Serializes with membership changes on a shared wallet (the same lock Remove/leave/transfer take). */
  lockMembership?(id: string, context: TransactionContext): Promise<void>;
  adjust(id: string, userId: string, delta: number, context: TransactionContext): Promise<void>;
  findById?(id: string, context?: TransactionContext): Promise<WalletRecord | null>;
  findOwned?(id: string, userId: string, context?: TransactionContext): Promise<WalletRecord | null>;
}

export interface CategoryAccess { typeOf(id: string, userId: string, context: TransactionContext): Promise<string | null> }
