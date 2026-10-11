import { useQuery } from "@tanstack/react-query";

import type { MonthKey } from "@/features/homepage/month";
import { getTransactions } from "@/features/transactions/transactionsService";

export const TRANSACTIONS_QUERY_KEY = ["transactions"] as const;

/**
 * Transactions for the given months, newest first. The key is
 * `["transactions", "2026-10,2026-11"]`, so invalidating
 * `TRANSACTIONS_QUERY_KEY` refreshes every month a page might be showing.
 * Pass a stable array (e.g. `useMemo`) — the key is derived from its contents.
 */
export function useTransactions(months: MonthKey[]) {
  return useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEY, months.join(",")],
    queryFn: () => getTransactions(months),
  });
}
