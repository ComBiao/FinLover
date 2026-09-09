import { create } from "zustand";

import { DEFAULT_TRANSACTION_FILTERS, type TransactionFilters } from "@/types/transaction";

type TransactionFiltersState = {
  filters: TransactionFilters;
  setFilters: (filters: TransactionFilters) => void;
  resetFilters: () => void;
};

/** Search/Wallet/Category/DateRange filter state for the Transactions page. */
export const useTransactionFilters = create<TransactionFiltersState>((set) => ({
  filters: DEFAULT_TRANSACTION_FILTERS,
  setFilters: (filters) => set({ filters }),
  resetFilters: () => set({ filters: DEFAULT_TRANSACTION_FILTERS }),
}));
