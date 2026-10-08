"use client";

import { MonthPicker } from "@/features/homepage/components/MonthPicker";
import { DayRangePicker } from "@/features/transactions/components/DayRangePicker";
import { PeriodModeToggle } from "@/features/transactions/components/PeriodModeToggle";
import { YearPicker } from "@/features/transactions/components/YearPicker";
import type { PeriodMode, TransactionPeriod } from "@/features/transactions/period";
import { cn } from "@/lib/utils";

type PeriodPickerProps = {
  value: TransactionPeriod;
  onValueChange: (period: TransactionPeriod) => void;
  onModeChange: (mode: PeriodMode) => void;
  className?: string;
};

/**
 * Transactions time filter: a Day/Month/Year mode toggle plus the matching
 * period selector. Month mode reuses Home's `MonthPicker` directly rather
 * than duplicating its 12-month grid popover.
 */
export function PeriodPicker({ value, onValueChange, onModeChange, className }: PeriodPickerProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <PeriodModeToggle value={value.mode} onValueChange={onModeChange} />

      {value.mode === "month" ? (
        <MonthPicker
          value={value.monthKey}
          onValueChange={(monthKey) => onValueChange({ mode: "month", monthKey })}
        />
      ) : value.mode === "year" ? (
        <YearPicker value={value.year} onValueChange={(year) => onValueChange({ mode: "year", year })} />
      ) : (
        <DayRangePicker
          value={{ from: value.from, to: value.to }}
          onValueChange={({ from, to }) => onValueChange({ mode: "day", from, to })}
        />
      )}
    </div>
  );
}
