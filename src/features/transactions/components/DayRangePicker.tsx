"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { periodLabel, shiftDayRange } from "@/features/transactions/period";
import type { DateRange } from "@/types/dateRange";

type DayRange = { from: Date; to: Date };

type DayRangePickerProps = {
  value: DayRange;
  onValueChange: (range: DayRange) => void;
  className?: string;
};

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Day-range selector: `‹ [📅 label] ›` arrows step by the current range's
 * length, and clicking the label opens the same two-month range calendar the
 * old Custom date-range filter used, with Today/Done footer buttons.
 * Selection is held as local pending state and only committed on "Done" (or
 * instantly via "Today"), so browsing the calendar doesn't re-filter the
 * table until confirmed — a single click with no end date, then "Done",
 * collapses to a single-day range.
 */
export function DayRangePicker({ value, onValueChange, className }: DayRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<DateRange | undefined>(value);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setPending(value);
  }

  function handleDone() {
    if (!pending?.from) return;
    onValueChange({ from: pending.from, to: pending.to ?? pending.from });
    setOpen(false);
  }

  function handleToday() {
    const today = startOfToday();
    onValueChange({ from: today, to: today });
    setOpen(false);
  }

  const label = periodLabel({ mode: "day", from: value.from, to: value.to });
  const pendingLabel = pending?.from
    ? periodLabel({ mode: "day", from: pending.from, to: pending.to ?? pending.from })
    : null;

  return (
    <div className={cn("flex items-center gap-0.5 rounded-xl border border-border bg-card p-1", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Previous period"
        onClick={() => onValueChange(shiftDayRange(value, -1))}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-haspopup="dialog"
              className="min-w-40 gap-1.5 font-semibold"
            />
          }
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          {label}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          <Calendar mode="range" selected={pending} onSelect={setPending} defaultMonth={value.from} numberOfMonths={2} />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
            <span className="text-xs text-muted-foreground">
              {pending?.from && !pending?.to
                ? "Pick an end date (or Done for a single day)"
                : `Selected: ${pendingLabel}`}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleToday}>
                Today
              </Button>
              <Button type="button" size="sm" onClick={handleDone} disabled={!pending?.from}>
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Next period"
        onClick={() => onValueChange(shiftDayRange(value, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
