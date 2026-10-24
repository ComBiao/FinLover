import { getApi } from "@/lib/api/client";
import { reportQueryString } from "@/features/reports/distributionService";
import { mockRunningBalance } from "@/features/reports/reportsCharts.mock";
import type { RunningBalance, RunningBalanceInterval } from "@/features/reports/distribution.types";
import type { ReportFilter } from "@/features/reports/types";

// DEV ONLY — removed before PR (Phase 2 cleanup)
const USE_MOCK = process.env.NEXT_PUBLIC_REPORTS_MOCK === "1";

/** `GET /api/v1/reports/running-balance` (US8-5). */
export function getRunningBalance(filter: ReportFilter, interval: RunningBalanceInterval): Promise<RunningBalance> {
  if (USE_MOCK) return mockRunningBalance(filter, interval);
  return getApi<RunningBalance>(`/api/v1/reports/running-balance?${reportQueryString(filter, { interval })}`);
}
