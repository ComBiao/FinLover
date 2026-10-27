"use client";

import { useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ReportSection } from "@/features/reports/components/ReportSection";
import { RunningBalanceChart } from "@/features/reports/components/RunningBalanceChart";
import type { RunningBalanceInterval } from "@/shared/contracts";
import { useRunningBalance } from "@/features/reports/hooks/useRunningBalance";
import { MAX_BUCKETS, isIntervalAllowed } from "@/features/reports/period";
import { defaultRunningBalanceInterval, runningBalanceErrorMessage } from "@/features/reports/runningBalanceFormat";
import type { ReportFilter } from "@/features/reports/types";

const INTERVALS: { value: RunningBalanceInterval; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const filterKey = (filter: ReportFilter) => `${filter.walletIds.join(",")}|${filter.startDate}|${filter.endDate}`;

/**
 * US8-5: the balance line for the filter. The toggle starts on a default for
 * the range length; a pick is kept only for the filter it was made on.
 * Never "empty": a flat line at the opening balance is still an answer.
 */
export function RunningBalanceSection({ walletIds, startDate, endDate }: ReportFilter) {
  const filter: ReportFilter = { walletIds, startDate, endDate };
  // The pick is stored with the filter it was made for, so a new filter discards it without an effect.
  const [pick, setPick] = useState<{ key: string; interval: RunningBalanceInterval } | null>(null);
  const key = filterKey(filter);
  const active = pick?.key === key ? pick.interval : defaultRunningBalanceInterval(startDate, endDate);

  const query = useRunningBalance(filter, active);

  const toggle = (
    <ToggleGroup
      aria-label="Interval"
      variant="outline"
      size="sm"
      spacing={0}
      value={[active]}
      onValueChange={(next) => {
        const chosen = next[0] as RunningBalanceInterval | undefined;
        if (chosen && chosen !== active) setPick({ key, interval: chosen });
      }}
    >
      {INTERVALS.map(({ value, label }) => {
        const allowed = isIntervalAllowed(startDate, endDate, value);
        return (
          <span
            key={value}
            title={allowed ? undefined : `Too many ${label.toLowerCase()} points for this range (max ${MAX_BUCKETS})`}
          >
            <ToggleGroupItem value={value} disabled={!allowed} className="px-3">
              {label}
            </ToggleGroupItem>
          </span>
        );
      })}
    </ToggleGroup>
  );

  return (
    <ReportSection
      title="Running balance"
      description={active === "weekly" ? "Balance at the end of each week" : "Balance after each day"}
      action={toggle}
      query={query}
      errorMessage={runningBalanceErrorMessage}
    >
      {(data) => <RunningBalanceChart data={data} />}
    </ReportSection>
  );
}
