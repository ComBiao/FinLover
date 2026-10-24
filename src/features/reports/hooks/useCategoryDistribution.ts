import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getCategoryDistribution } from "@/features/reports/distributionService";
import type { ReportFilter } from "@/features/reports/types";

/** US8-4 income / expense breakdown by category for the applied filter. */
export function useCategoryDistribution(filter: ReportFilter) {
  return useQuery({
    queryKey: ["reports", "category-distribution", filter],
    queryFn: () => getCategoryDistribution(filter),
    placeholderData: keepPreviousData,
  });
}
