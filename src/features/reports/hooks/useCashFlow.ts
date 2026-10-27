import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getCashFlow } from "@/features/reports/reportsService";
import type { ReportFilter, ReportInterval } from "@/features/reports/types";

/**
 * US8-3 buckets for the applied filter. `interval` undefined means "let the
 * server suggest one" — the first load, and again after every filter change.
 */
export function useCashFlow(filter: ReportFilter | null, interval?: ReportInterval) {
  return useQuery({
    queryKey: ["reports", "cash-flow", filter, interval ?? "suggested"],
    queryFn: () => getCashFlow(filter as ReportFilter, interval),
    enabled: filter !== null,
    placeholderData: keepPreviousData,
    // Offline, the default networkMode pauses the request for good: the old data stays dimmed under the new period and no error shows.
    networkMode: "always",
  });
}
