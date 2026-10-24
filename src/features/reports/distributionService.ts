import { getApi } from "@/lib/api/client";
import { mockCategoryDistribution } from "@/features/reports/reportsCharts.mock";
import type { CategoryDistribution } from "@/features/reports/distribution.types";
import type { ReportFilter } from "@/features/reports/types";

// DEV ONLY — removed before PR (Phase 2 cleanup)
const USE_MOCK = process.env.NEXT_PUBLIC_REPORTS_MOCK === "1";

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
export function getCategoryDistribution(filter: ReportFilter): Promise<CategoryDistribution> {
  if (USE_MOCK) return mockCategoryDistribution(filter);
  return getApi<CategoryDistribution>(`/api/v1/reports/category-distribution?${reportQueryString(filter)}`);
}
