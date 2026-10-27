"use client";

import { DonutCard } from "@/features/reports/components/DonutCard";
import { ReportSection } from "@/features/reports/components/ReportSection";
import { useCategoryDistribution } from "@/features/reports/hooks/useCategoryDistribution";
import type { ReportFilter } from "@/features/reports/types";

/** US8-4: an Income donut and an Expense donut side by side (stacked on mobile). */
export function CategoryDistributionSection({ walletIds, startDate, endDate }: ReportFilter) {
  const query = useCategoryDistribution({ walletIds, startDate, endDate });

  return (
    <ReportSection
      title="Category distribution"
      description="Where your income comes from and where it goes"
      query={query}
      isEmpty={(data) => data.income.total === 0 && data.expense.total === 0}
    >
      {(data) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DonutCard title="Income" side={data.income} emptyMessage="No income transactions for this period" />
          <DonutCard title="Expense" side={data.expense} emptyMessage="No expense transactions for this period" />
        </div>
      )}
    </ReportSection>
  );
}
