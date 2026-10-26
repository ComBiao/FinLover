import { useQuery } from "@tanstack/react-query";

import type { MonthKey } from "@/features/homepage/month";
import { getSharedWalletTransactions, getTransactions } from "@/features/transactions/transactionsService";

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

/**
 * One shared wallet's transactions (every member's) for the given months, newest first. The API
 * serves one `YYYY-MM` per request, so a year makes twelve. Under `TRANSACTIONS_QUERY_KEY`, so a
 * create/edit/delete refreshes it too. Idle while `walletId` is undefined.
 */
export function useSharedWalletPeriodTransactions(walletId: string | undefined, months: MonthKey[]) {
  return useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEY, "shared", walletId, months.join(",")],
    queryFn: async () => {
      const pages = await Promise.all(months.map((month) => getSharedWalletTransactions(walletId as string, month)));
      return pages.flat().sort((a, b) => b.date.getTime() - a.date.getTime());
    },
    enabled: Boolean(walletId),
  });
}
