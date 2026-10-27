"use client";

import { useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CashFlowChart } from "@/features/reports/components/CashFlowChart";
import { ReportSection } from "@/features/reports/components/ReportSection";
import { errorMessageOf } from "@/features/reports/components/ReportStates";
import { segmentedGroupClass, segmentedItemClass } from "@/features/reports/components/segmented";
import { RANGE_TOO_LARGE_MESSAGE, isCashFlowEmpty } from "@/features/reports/cashFlowFormat";
import { useCashFlow } from "@/features/reports/hooks/useCashFlow";
import { isIntervalAllowed, MAX_BUCKETS } from "@/features/reports/period";
import type { ReportFilter, ReportInterval } from "@/features/reports/types";
import { ApiClientError } from "@/lib/api/client";

const INTERVALS: { value: ReportInterval; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const filterKey = (filter: ReportFilter) => `${filter.walletIds.join(",")}|${filter.startDate}|${filter.endDate}`;

/** The server rejects an interval that would make too many buckets with a field error on `interval`. */
function cashFlowErrorMessage(error: unknown) {
  return error instanceof ApiClientError && error.fields?.interval ? RANGE_TOO_LARGE_MESSAGE : errorMessageOf(error);
}

/**
 * US8-3: income vs expense bars per bucket. The first load lets the server
 * suggest the interval and the toggle starts on it; picking one asks for it
 * explicitly, and any filter change goes back to the suggestion.
 */
export function CashFlowSection({ filter }: { filter: ReportFilter }) {
  // The pick is stored with the filter it was made for, so a new filter discards it without an effect.
  const [pick, setPick] = useState<{ key: string; interval: ReportInterval } | null>(null);
  const key = filterKey(filter);
  const override = pick?.key === key ? pick.interval : undefined;

  const query = useCashFlow(filter, override);
  const active = override ?? query.data?.suggestedInterval;

  const toggle = (
    <ToggleGroup
      aria-label="Interval"
      size="sm"
      spacing={1}
      className={segmentedGroupClass}
      value={active ? [active] : []}
      onValueChange={(next) => {
        const chosen = next[0] as ReportInterval | undefined;
        if (chosen && chosen !== active) setPick({ key, interval: chosen });
      }}
    >
      {INTERVALS.map(({ value, label }) => {
        const allowed = isIntervalAllowed(filter.startDate, filter.endDate, value);
        return (
          <span
            key={value}
            title={allowed ? undefined : `Too many ${label.toLowerCase()} buckets for this range (max ${MAX_BUCKETS})`}
          >
            <ToggleGroupItem value={value} disabled={!allowed} className={segmentedItemClass}>
              {label}
            </ToggleGroupItem>
          </span>
        );
      })}
    </ToggleGroup>
  );

  return (
    <ReportSection
      title="Cash flow"
      description="Income and expenses over time"
      action={toggle}
      query={query}
      isEmpty={(data) => isCashFlowEmpty(data.buckets)}
      emptyMessage="No transactions recorded in this period"
      errorMessage={cashFlowErrorMessage}
    >
      {(data) => <CashFlowChart buckets={data.buckets} interval={data.interval} />}
    </ReportSection>
  );
}
