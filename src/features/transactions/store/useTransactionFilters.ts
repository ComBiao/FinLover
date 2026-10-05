import { create } from "zustand";

import { currentPeriod, periodToDateRange, type TransactionPeriod } from "@/features/transactions/period";
import { DEFAULT_TRANSACTION_FILTERS, type TransactionFilters } from "@/types/transaction";

function defaultFilters(): TransactionFilters {
  return { ...DEFAULT_TRANSACTION_FILTERS, dateRange: periodToDateRange(currentPeriod()) };
}

type TransactionFiltersState = {
  filters: TransactionFilters;
  period: TransactionPeriod;
  setFilters: (filters: TransactionFilters) => void;
  setPeriod: (period: TransactionPeriod) => void;
  resetFilters: () => void;
};

/**
 * Search/Type/Wallet/Category/period filter state for the Transactions page.
 * `period` drives `filters.dateRange` — `setPeriod` keeps the two in sync so
 * `filterTransactions` only ever needs to read `filters.dateRange`.
 */
export const useTransactionFilters = create<TransactionFiltersState>((set, get) => ({
  filters: defaultFilters(),
  period: currentPeriod(),
  setFilters: (filters) => set({ filters }),
  setPeriod: (period) => set({ period, filters: { ...get().filters, dateRange: periodToDateRange(period) } }),
  resetFilters: () => set({ filters: defaultFilters(), period: currentPeriod() }),
}));
