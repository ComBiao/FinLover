import { UNCATEGORIZED_VALUE } from "@/components/CategorySelector";
import type { Transaction, TransactionFilters } from "@/types/transaction";

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
      if (filters.categoryId === UNCATEGORIZED_VALUE) {
        if (transaction.categoryId) return false;
      } else if (filters.categoryId && transaction.categoryId !== filters.categoryId) {
        return false;
      }
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

export type TransactionSummary = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
};

/** Total income, total expense, and net balance for a list of transactions. */
export function summarizeTransactions(transactions: Transaction[]): TransactionSummary {
  const totalIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalExpense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return { totalIncome, totalExpense, netBalance: totalIncome - totalExpense };
}
