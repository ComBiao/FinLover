import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getReportSummary } from "@/features/reports/reportsService";
import type { ReportFilter } from "@/features/reports/types";

/** US8-2 totals for the applied filter. The previous totals stay on screen while new ones load. */
export function useReportSummary(filter: ReportFilter | null) {
  return useQuery({
    queryKey: ["reports", "summary", filter],
    queryFn: () => getReportSummary(filter as ReportFilter),
    enabled: filter !== null,
    placeholderData: keepPreviousData,
    // Offline, the default networkMode pauses the request for good: the old data stays dimmed under the new period and no error shows.
    networkMode: "always",
  });
}
