import { getApi } from "@/lib/api/client";
import { mockCashFlow, mockSummary } from "@/features/reports/reports.mock";
import type { CashFlowResponse, ReportFilter, ReportInterval, ReportSummary } from "@/features/reports/types";

// DEV ONLY — remove with reports.mock.ts before the PR is opened (Guy's endpoints replace it).
const USE_MOCK = process.env.NEXT_PUBLIC_REPORTS_MOCK === "1";

function queryString(filter: ReportFilter, interval?: ReportInterval) {
  const params = new URLSearchParams({
    walletIds: filter.walletIds.join(","),
    startDate: filter.startDate,
    endDate: filter.endDate,
  });
  if (interval) params.set("interval", interval);
  return params.toString();
}

/** `GET /api/v1/reports/summary` (US8-2). */
export function getReportSummary(filter: ReportFilter): Promise<ReportSummary> {
  if (USE_MOCK) return mockSummary(filter);
  return getApi<ReportSummary>(`/api/v1/reports/summary?${queryString(filter)}`);
}

/**
 * `GET /api/v1/reports/cash-flow` (US8-3). Without an `interval` the server
 * picks one and reports it back as `suggestedInterval`.
 */
export function getCashFlow(filter: ReportFilter, interval?: ReportInterval): Promise<CashFlowResponse> {
  if (USE_MOCK) return mockCashFlow(filter, interval);
  return getApi<CashFlowResponse>(`/api/v1/reports/cash-flow?${queryString(filter, interval)}`);
}
