import { useQuery } from "@tanstack/react-query";

import { getTransactions } from "@/features/transactions/transactionsService";

export const TRANSACTIONS_QUERY_KEY = ["transactions"] as const;

/**
 * The full mock transaction list — shared by the Transactions page and
 * Home, so an add/edit/delete from either page is immediately visible in
 * the other (both hold the same TanStack Query cache entry).
 */
export function useTransactions() {
  return useQuery({ queryKey: TRANSACTIONS_QUERY_KEY, queryFn: getTransactions });
}
