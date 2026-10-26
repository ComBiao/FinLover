import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { periodToDateRange, type TransactionPeriod } from "@/features/transactions/period";
import { getTransactionSummary, type TransactionSummaryQuery } from "@/features/transactions/transactionsService";
import { TRANSACTIONS_QUERY_KEY } from "@/features/transactions/hooks/useTransactions";
import { toLocalISODate } from "@/lib/utils";
import type { TransactionFilters } from "@/types/transaction";

/** How long the search box must be idle before the totals are re-requested. */
export const SUMMARY_SEARCH_DELAY_MS = 300;
/** The API's search limit; longer text is cut rather than rejected. */
const MAX_SEARCH_LENGTH = 100;

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Server-computed Spent / Income / Net for the Transactions page's period and
 * filters (US3-6). Keyed under `TRANSACTIONS_QUERY_KEY`, so every mutation
 * that refreshes the list refreshes these totals too. Previous totals stay on
 * screen while new ones load. Pass `enabled: false` while a shared wallet is
 * filtered: the server has no summary for those (the page totals its rows instead).
 */
export function useTransactionSummary(period: TransactionPeriod, filters: TransactionFilters, { enabled = true } = {}) {
  const search = useDebouncedValue(filters.search.trim().slice(0, MAX_SEARCH_LENGTH), SUMMARY_SEARCH_DELAY_MS);
  // Every period mode yields both ends; `DateRange` only types them optional for the free-form filter.
  const { from, to } = periodToDateRange(period);
  const query: TransactionSummaryQuery = {
    from: toLocalISODate(from!),
    to: toLocalISODate(to!),
    walletId: filters.walletId,
    categoryId: filters.categoryId,
    type: filters.type,
    search: search || undefined,
  };

  return useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEY, "summary", query],
    queryFn: () => getTransactionSummary(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}
