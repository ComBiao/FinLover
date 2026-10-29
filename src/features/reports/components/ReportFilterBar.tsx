"use client";

import { Info, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthPicker } from "@/features/homepage/components/MonthPicker";
import type { MonthKey } from "@/features/homepage/month";
import { SlidingToggle, type SlidingToggleOption } from "@/features/reports/components/SlidingToggle";
import { WeekPicker } from "@/features/reports/components/WeekPicker";
import {
  WalletMultiSelect,
  walletSummaryLabel,
  type WalletOption,
} from "@/features/reports/components/WalletMultiSelect";
import type { ReportFilterState } from "@/features/reports/hooks/useReportFilter";
import { isoToLocalDate, rangeLabel, type ReportPreset } from "@/features/reports/period";
import { DayRangePicker } from "@/features/transactions/components/DayRangePicker";
import { YearPicker } from "@/features/transactions/components/YearPicker";
import { toLocalISODate } from "@/lib/utils";

const PRESETS: SlidingToggleOption<ReportPreset>[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
  { value: "custom", label: "Custom" },
];

type ReportFilterBarProps = {
  wallets: WalletOption[];
  filter: ReportFilterState;
  /** True while the wallet list is still loading: the bar shows a skeleton. */
  isLoading?: boolean;
};

/** Filter bar skeleton while the wallets load. */
function FilterBarSkeleton() {
  return (
    <div role="status" aria-label="Loading filters" aria-busy="true" className="flex flex-wrap items-center gap-3">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-9 w-44" />
    </div>
  );
}

/**
 * The period selector that goes with the chosen preset, built from the same pieces as the Home and
 * Transactions pages: a week picker, Home's `MonthPicker`, the Transactions `YearPicker` and
 * `DayRangePicker` (one range calendar for Custom). Each carries its own previous / next arrows.
 */
function PeriodNavigator({ filter }: { filter: ReportFilterState }) {
  const { preset, range } = filter;

  if (preset === "weekly") {
    return <WeekPicker range={range} onPickDay={filter.jumpTo} onShift={filter.shift} />;
  }
  if (preset === "monthly") {
    return (
      <MonthPicker
        value={range.startDate.slice(0, 7) as MonthKey}
        onValueChange={(monthKey) => filter.jumpTo(`${monthKey}-01`)}
      />
    );
  }
  if (preset === "annual") {
    return (
      <YearPicker
        value={Number(range.startDate.slice(0, 4))}
        onValueChange={(year) => filter.jumpTo(`${year}-01-01`)}
      />
    );
  }
  return (
    <DayRangePicker
      value={{ from: isoToLocalDate(range.startDate), to: isoToLocalDate(range.endDate) }}
      onValueChange={({ from, to }) => filter.setRange({ startDate: toLocalISODate(from), endDate: toLocalISODate(to) })}
    />
  );
}

/**
 * US8-1: wallet multi-select, a Weekly / Monthly / Annual / Custom period with its picker,
 * the wallet validation message, and chips of what is applied (with Reset). It only edits state;
 * `useReportFilter` decides when to apply.
 */
export function ReportFilterBar({ wallets, filter, isLoading = false }: ReportFilterBarProps) {
  const { preset, range, errors } = filter;
  // The chips describe what the sections show (the applied filter), not the draft being edited.
  const shown = filter.applied ?? { walletIds: filter.walletIds, ...range };
  const shownRange = { startDate: shown.startDate, endDate: shown.endDate };
  const shownPreset = filter.applied ? filter.appliedPreset : preset;
  const showingLastValid = !filter.isValid && filter.applied !== null;

  return (
    <div
      role="search"
      aria-label="Report filters"
      // sticky from md up only: below that the sidebar's floating menu button sits over the top-left corner
      className="md:sticky md:top-0 md:z-30 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        {isLoading ? (
          <FilterBarSkeleton />
        ) : (
          <>
            <div className="flex flex-wrap items-start gap-3">
              <WalletMultiSelect
                wallets={wallets}
                selectedIds={filter.walletIds}
                onChange={filter.setWalletIds}
                onSelectAll={filter.selectAllWallets}
                // With no wallets at all the page says so itself; a "select a wallet" error would be misleading.
                error={wallets.length > 0 ? errors.walletIds : undefined}
              />

              <SlidingToggle aria-label="Period" value={preset} onValueChange={filter.setPreset} options={PRESETS} />

              <PeriodNavigator filter={filter} />
            </div>

            <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
              <Badge variant="secondary">Wallets: {walletSummaryLabel(wallets, shown.walletIds)}</Badge>
              <Badge variant="secondary">Period: {rangeLabel(shownPreset, shownRange)}</Badge>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={filter.reset}
                disabled={!filter.isModified}
                className="gap-1 border-primary/40 bg-card font-semibold text-primary hover:bg-primary/10 hover:text-primary"
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                Reset
              </Button>
              {showingLastValid ? (
                <p role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="size-3.5 shrink-0" aria-hidden="true" />
                  Select at least one wallet to update the report. The results below still match the filters shown here.
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
