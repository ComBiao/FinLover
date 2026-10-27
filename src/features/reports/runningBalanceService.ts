import { getApi } from "@/lib/api/client";
import { reportQueryString } from "@/features/reports/distributionService";
import type { RunningBalanceInterval, RunningBalanceResponse } from "@/shared/contracts";
import type { ReportFilter } from "@/features/reports/types";

/** `GET /api/v1/reports/running-balance` (US8-5). */
export function getRunningBalance(
  filter: ReportFilter,
  interval: RunningBalanceInterval,
): Promise<RunningBalanceResponse> {
  return getApi<RunningBalanceResponse>(`/api/v1/reports/running-balance?${reportQueryString(filter, { interval })}`);
}
