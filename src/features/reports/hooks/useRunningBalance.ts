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
  });
}
