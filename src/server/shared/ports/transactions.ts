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
  /**
   * Shared wallets whose rows from every member are included (reports only). The caller has already
   * checked the membership; the repository only keeps ids that really are shared wallets.
   */
  sharedWalletIds?: string[];
  type?: 'income' | 'expense';
  /** Matches any of these; `null` matches transactions without a category. */
  categoryIds?: (string | null)[];
  search?: string;
}
export interface TransactionSummaryReader { sumByType(userId: string, filter: TransactionSummaryFilter): Promise<{ income: number; expense: number; count: number }> }
/**
 * Report filters: UTC-midnight bounds with `end` exclusive. `walletIds` are the caller's own personal
 * wallets (only their rows count); `sharedWalletIds` are shared wallets, where every member's rows count.
 */
export interface TransactionReportFilter { start: Date; end: Date; walletIds: string[]; sharedWalletIds?: string[] }
export interface TransactionReportReader {
  /** Income and expense per UTC calendar day (YYYY-MM-DD) that has transactions, oldest first. */
  totalsByDay(userId: string, filter: TransactionReportFilter): Promise<{ date: string; income: number; expense: number }[]>;
  /**
   * Amount per category and type. Personal rows carry a `categoryId` (null when they have none); rows of a
   * shared wallet (`shared`) carry a preset `categoryKey` instead (null falls back to the type's Others).
   */
  totalsByCategory(userId: string, filter: TransactionReportFilter): Promise<{ categoryId: string | null; categoryKey: string | null; shared: boolean; type: 'income' | 'expense'; amount: number }[]>;
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
