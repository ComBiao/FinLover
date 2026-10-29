"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isoToLocalDate, rangeLabel, todayISO, type DateRangeStrings } from "@/features/reports/period";
import { cn, toLocalISODate } from "@/lib/utils";

type WeekPickerProps = {
  /** The week on screen (Monday to Sunday). */
  range: DateRangeStrings;
  /** Any `YYYY-MM-DD` day inside the week the user picked. */
  onPickDay: (day: string) => void;
  onShift: (direction: 1 | -1) => void;
  className?: string;
};

/**
 * Week selector with the same shape as Home's `MonthPicker` and the Transactions `DayRangePicker`:
 * `‹ [📅 label] ›` steps one week at a time and the label opens a calendar where any day picks the
 * Monday-to-Sunday week it sits in (the whole week is shaded).
 */
export function WeekPicker({ range, onPickDay, onShift, className }: WeekPickerProps) {
  const [open, setOpen] = React.useState(false);
  const from = isoToLocalDate(range.startDate);
  const to = isoToLocalDate(range.endDate);

  function pick(day: Date | undefined) {
    if (!day) return;
    onPickDay(toLocalISODate(day));
    setOpen(false);
  }

  return (
    <div className={cn("flex items-center gap-0.5 rounded-xl border border-border bg-card p-1 max-sm:w-full", className)}>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Previous week" onClick={() => onShift(-1)}>
        <ChevronLeft className="size-4" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-haspopup="dialog"
              className="min-w-40 gap-1.5 font-semibold max-sm:flex-1"
            />
          }
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          {rangeLabel("weekly", range)}
        </PopoverTrigger>
        <PopoverContent align="start" className="max-h-[80dvh] w-auto max-w-[calc(100vw-2rem)] overflow-y-auto p-3">
          <Calendar
            mode="single"
            selected={from}
            onSelect={pick}
            defaultMonth={from}
            weekStartsOn={1}
            modifiers={{ week: { from, to } }}
            modifiersClassNames={{ week: "bg-primary/10" }}
          />
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2.5">
            <span className="text-xs text-muted-foreground">Pick any day to select its week</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onPickDay(todayISO());
                setOpen(false);
              }}
            >
              This week
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button type="button" variant="ghost" size="icon-sm" aria-label="Next week" onClick={() => onShift(1)}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
