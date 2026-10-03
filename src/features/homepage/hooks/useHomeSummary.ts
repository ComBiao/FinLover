import { useQuery } from "@tanstack/react-query";

import { getHomeSummary } from "@/features/homepage/services/homeService";
import type { MonthKey } from "@/features/homepage/month";

/**
 * "home-summary" is the query-key prefix `useTransactionMutations` invalidates
 * after every create/edit/delete — keep that string in sync with this one.
 */
export function useHomeSummary(month: MonthKey, walletId: string) {
  return useQuery({
    queryKey: ["home-summary", month, walletId],
    queryFn: () => getHomeSummary(month, walletId),
  });
}
