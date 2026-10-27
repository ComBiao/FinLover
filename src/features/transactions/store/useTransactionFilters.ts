import { create } from "zustand";

import {
  anchorFromPeriod,
  currentPeriod,
  periodFromAnchor,
  periodToDateRange,
  todayAnchor,
  type PeriodMode,
  type TransactionPeriod,
} from "@/features/transactions/period";
import { DEFAULT_TRANSACTION_FILTERS, type TransactionFilters } from "@/types/transaction";

function defaultFilters(): TransactionFilters {
  return { ...DEFAULT_TRANSACTION_FILTERS, dateRange: periodToDateRange(currentPeriod()) };
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function restoreDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date(value); // Existing ISO snapshots contain instants.
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (localDateKey(date) !== value) throw new Error("Invalid saved calendar date");
  return date;
}

type TransactionFiltersState = {
  filters: TransactionFilters;
  period: TransactionPeriod;
  /** The date mode switches start from; moves only when the user navigates (‹ ›, picking a month/year/range). */
  anchor: Date;
  setFilters: (filters: TransactionFilters) => void;
  setPeriod: (period: TransactionPeriod) => void;
  setMode: (mode: PeriodMode) => void;
  resetFilters: () => void;
};

/**
 * Search/Type/Wallet/Category/period filter state for the Transactions page.
 * `period` drives `filters.dateRange` — `setPeriod`/`setMode` keep the two in
 * sync so `filterTransactions` only ever needs to read `filters.dateRange`.
 */
export const useTransactionFilters = create<TransactionFiltersState>((set, get) => ({
  filters: defaultFilters(),
  period: currentPeriod(),
  anchor: todayAnchor(),
  setFilters: (filters) => set({ filters }),
  setPeriod: (period) =>
    set({
      period,
      anchor: anchorFromPeriod(period, get().anchor),
      filters: { ...get().filters, dateRange: periodToDateRange(period) },
    }),
  setMode: (mode) => {
    const period = periodFromAnchor(get().anchor, mode);
    set({ period, filters: { ...get().filters, dateRange: periodToDateRange(period) } });
  },
  resetFilters: () => set({ filters: defaultFilters(), period: currentPeriod(), anchor: todayAnchor() }),
}));

export function restoreTransactionFilters() {
  let saved: string | null;
  try {
    saved = window.sessionStorage.getItem("transactionFilters");
  } catch (error) {
    console.warn("Could not restore transaction filters", error);
    return;
  }
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    const period: TransactionPeriod = parsed.period.mode === "day"
      ? { mode: "day", from: restoreDate(parsed.period.from), to: restoreDate(parsed.period.to) }
      : parsed.period;
    const dateRange = periodToDateRange(period);
    useTransactionFilters.setState({
      period,
      anchor: restoreDate(parsed.anchor),
      filters: { ...defaultFilters(), ...parsed.filters, dateRange },
    });
  } catch (error) {
    console.warn("Could not restore transaction filters", error);
    try {
      window.sessionStorage.removeItem("transactionFilters");
    } catch (removeError) {
      console.warn("Could not clear saved transaction filters", removeError);
    }
  }
}

if (typeof window !== "undefined") {
  restoreTransactionFilters();
  useTransactionFilters.subscribe((state) => {
    try {
      window.sessionStorage.setItem("transactionFilters", JSON.stringify({
        filters: state.filters,
        period: state.period.mode === "day"
          ? { mode: "day", from: localDateKey(state.period.from), to: localDateKey(state.period.to) }
          : state.period,
        anchor: localDateKey(state.anchor),
      }));
    } catch (error) {
      console.warn("Could not save transaction filters", error);
    }
  });
}
