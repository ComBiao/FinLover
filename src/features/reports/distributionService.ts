import { getApi } from "@/lib/api/client";
import type { CategoryDistributionResponse } from "@/shared/contracts";
import type { ReportFilter } from "@/features/reports/types";

/** `walletIds` is comma-separated; dates are inclusive `YYYY-MM-DD`. */
export function reportQueryString(filter: ReportFilter, extra?: Record<string, string>) {
  const params = new URLSearchParams({
    walletIds: filter.walletIds.join(","),
    startDate: filter.startDate,
    endDate: filter.endDate,
    ...extra,
  });
  return params.toString();
}

/** `GET /api/v1/reports/category-distribution` (US8-4). */
export function getCategoryDistribution(filter: ReportFilter): Promise<CategoryDistributionResponse> {
  return getApi<CategoryDistributionResponse>(`/api/v1/reports/category-distribution?${reportQueryString(filter)}`);
}
