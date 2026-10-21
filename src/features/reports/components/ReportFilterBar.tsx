"use client";

import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  WalletMultiSelect,
  walletSummaryLabel,
  type WalletOption,
} from "@/features/reports/components/WalletMultiSelect";
import type { ReportFilterState } from "@/features/reports/hooks/useReportFilter";
import { rangeLabel, type ReportPreset } from "@/features/reports/period";

const PRESETS: { value: ReportPreset; label: string }[] = [
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
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-8 w-44" />
    </div>
  );
}

/**
 * US8-1: wallet multi-select, a Weekly / Monthly / Annual / Custom period with
 * previous/next arrows, validation messages, and chips of what is applied
 * (with Reset). It only edits state; `useReportFilter` decides when to apply.
 */
export function ReportFilterBar({ wallets, filter, isLoading = false }: ReportFilterBarProps) {
  const { preset, range, errors } = filter;
  const isCustom = preset === "custom";

  return (
    <div
      role="search"
      aria-label="Report filters"
      className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
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

              <ToggleGroup
                aria-label="Period"
                variant="outline"
                size="default"
                spacing={0}
                value={[preset]}
                onValueChange={(next) => {
                  // clicking the pressed segment would deselect it; keep exactly one selected
                  const chosen = next[0] as ReportPreset | undefined;
                  if (chosen && chosen !== preset) filter.setPreset(chosen);
                }}
              >
                {PRESETS.map(({ value, label }) => (
                  <ToggleGroupItem key={value} value={value} className="px-3">
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              {isCustom ? (
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="report-start-date" className="sr-only">
                      Start date
                    </Label>
                    <Input
                      id="report-start-date"
                      type="date"
                      aria-label="Start date"
                      aria-invalid={errors.startDate ? true : undefined}
                      value={range.startDate}
                      onChange={(event) => filter.setStartDate(event.target.value)}
                      className="w-40"
                    />
                    {errors.startDate ? (
                      <p role="alert" className="text-xs text-destructive">
                        {errors.startDate}
                      </p>
                    ) : null}
                  </div>
                  <span className="pt-1.5 text-sm text-muted-foreground" aria-hidden="true">
                    to
                  </span>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="report-end-date" className="sr-only">
                      End date
                    </Label>
                    <Input
                      id="report-end-date"
                      type="date"
                      aria-label="End date"
                      aria-invalid={errors.endDate ? true : undefined}
                      value={range.endDate}
                      onChange={(event) => filter.setEndDate(event.target.value)}
                      className="w-40"
                    />
                    {errors.endDate ? (
                      <p role="alert" className="text-xs text-destructive">
                        {errors.endDate}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Previous period"
                    onClick={() => filter.shift(-1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="min-w-36 px-2 text-center text-sm font-semibold" aria-live="polite">
                    {rangeLabel(preset, range)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Next period"
                    onClick={() => filter.shift(1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
              <Badge variant="secondary">Wallets: {walletSummaryLabel(wallets, filter.walletIds)}</Badge>
              <Badge variant="secondary">Period: {rangeLabel(preset, range)}</Badge>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={filter.reset}
                disabled={!filter.isModified}
                className="gap-1"
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                Reset
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
