import { isFallbackCategory } from "@/features/categories/categoriesService";
import type { Category } from "@/types/category";
import type { Transaction, TransactionFilters } from "@/types/transaction";

/**
 * A transaction without a category (its category was deleted) counts as its
 * type's seeded "Others", so lists, filters and totals never need a separate
 * "Uncategorized" bucket. Left as-is when the user has no "Others" for that type.
 */
export function withFallbackCategory(transactions: Transaction[], categories: Category[]): Transaction[] {
  const fallbackIdByType = new Map(
    categories.filter(isFallbackCategory).map((category) => [category.type, category.id])
  );
  return transactions.map((transaction) => {
    if (transaction.categoryId) return transaction;
    const categoryId = fallbackIdByType.get(transaction.type);
    return categoryId ? { ...transaction, categoryId } : transaction;
  });
}

/** End of the given day (23:59:59.999) — so an inclusive "to" date filter doesn't exclude a same-day transaction with a later time-of-day. */
function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Applies the Transactions list's search/wallet/category/type/date-range
 * filters, then sorts the result by date descending (newest first).
 */
export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters
): Transaction[] {
  const query = filters.search.trim().toLowerCase();

  return transactions
    .filter((transaction) => {
      if (filters.walletId && transaction.walletId !== filters.walletId) return false;
      if (filters.categoryId && transaction.categoryId !== filters.categoryId) return false;
      if (filters.type && transaction.type !== filters.type) return false;
      if (filters.dateRange?.from && transaction.date < filters.dateRange.from) return false;
      if (filters.dateRange?.to && transaction.date > endOfDay(filters.dateRange.to)) return false;

      if (query) {
        const matchesTitle = transaction.title.toLowerCase().includes(query);
        const matchesNote = transaction.note?.toLowerCase().includes(query) ?? false;
        if (!matchesTitle && !matchesNote) return false;
      }

      return true;
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Spent / Income / Net for the Transactions page's active filters (`GET /api/v1/transactions/summary`). */
export type TransactionSummary = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
};
