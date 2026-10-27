import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getRunningBalance } from "@/features/reports/runningBalanceService";
import type { ReportFilter } from "@/features/reports/types";
import type { RunningBalanceInterval } from "@/shared/contracts";

/** US8-5 balance after each day (or week) of the applied filter. */
export function useRunningBalance(filter: ReportFilter, interval: RunningBalanceInterval) {
  return useQuery({
    queryKey: ["reports", "running-balance", filter, interval],
    queryFn: () => getRunningBalance(filter, interval),
    placeholderData: keepPreviousData,
    // Offline, the default networkMode pauses the request for good: the old data stays dimmed under the new period and no error shows.
    networkMode: "always",
  });
}
