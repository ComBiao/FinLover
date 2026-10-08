"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  currentMonthKey,
  formatMonthKey,
  MONTH_NAMES,
  monthKeyLabel,
  parseMonthKey,
  shiftMonthKey,
  type MonthKey,
} from "@/features/homepage/month";

type MonthPickerProps = {
  value: MonthKey;
  onValueChange: (next: MonthKey) => void;
  className?: string;
};

/**
 * Month selector: `‹ [📅 label] ›` arrows step one month at a time (no
 * past/future limit), and clicking the label opens a year ‹ › + 3x4 month
 * grid for jumping further. The popover browses its own year independently
 * of `value` until a month cell is actually picked.
 */
export function MonthPicker({ value, onValueChange, className }: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [calendarYear, setCalendarYear] = React.useState(() => parseMonthKey(value).year);
  const today = currentMonthKey();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setCalendarYear(parseMonthKey(value).year);
  }

  function pickMonth(month: number) {
    onValueChange(formatMonthKey(calendarYear, month));
    setOpen(false);
  }

  return (
    <div className={cn("flex items-center gap-0.5 rounded-xl border border-border bg-card p-1", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Previous month"
        onClick={() => onValueChange(shiftMonthKey(value, -1))}
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
          {monthKeyLabel(value)}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[300px] p-3">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Previous year"
              onClick={() => setCalendarYear((year) => year - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-base font-bold text-foreground">{calendarYear}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Next year"
              onClick={() => setCalendarYear((year) => year + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {MONTH_NAMES.map((name, index) => {
              const month = index + 1;
              const key = formatMonthKey(calendarYear, month);
              const isSelected = key === value;
              const isCurrent = key === today;

              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => pickMonth(month)}
                  className={cn(
                    "flex h-[54px] flex-col items-center justify-center gap-px rounded-xl border-2 text-sm font-medium transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCurrent
                        ? "border-primary/50 bg-primary/5 text-foreground"
                        : "border-border text-foreground hover:border-primary hover:bg-primary/5"
                  )}
                >
                  {name.slice(0, 3)}
                  {isCurrent ? (
                    <span
                      className={cn(
                        "text-[10px] font-bold tracking-wide",
                        isSelected ? "text-primary-foreground/80" : "text-primary"
                      )}
                    >
                      NOW
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
            <span className="text-xs text-muted-foreground">Selected: {monthKeyLabel(value)}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onValueChange(today);
                setCalendarYear(parseMonthKey(today).year);
                setOpen(false);
              }}
            >
              This month
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Next month"
        onClick={() => onValueChange(shiftMonthKey(value, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
