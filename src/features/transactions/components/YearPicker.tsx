"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type YearPickerProps = {
  value: number;
  onValueChange: (year: number) => void;
  className?: string;
};

const WINDOW_SIZE = 12;
const WINDOW_ANCHOR = 2000;

function windowStart(year: number) {
  return Math.floor((year - WINDOW_ANCHOR) / WINDOW_SIZE) * WINDOW_SIZE + WINDOW_ANCHOR;
}

/**
 * Year selector: `‹ [📅 year] ›` arrows step one year at a time (no
 * past/future limit), and clicking the label opens a 12-year grid for
 * jumping further — same structure as Home's `MonthPicker`.
 */
export function YearPicker({ value, onValueChange, className }: YearPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [gridStart, setGridStart] = React.useState(() => windowStart(value));
  const todayYear = new Date().getFullYear();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setGridStart(windowStart(value));
  }

  function pickYear(year: number) {
    onValueChange(year);
    setOpen(false);
  }

  const years = Array.from({ length: WINDOW_SIZE }, (_, index) => gridStart + index);

  return (
    <div className={cn("flex items-center gap-0.5 rounded-xl border border-border bg-card p-1", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Previous year"
        onClick={() => onValueChange(value - 1)}
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
          {value}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[300px] p-3">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Earlier years"
              onClick={() => setGridStart((start) => start - WINDOW_SIZE)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-base font-bold text-foreground">
              {gridStart} – {gridStart + WINDOW_SIZE - 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Later years"
              onClick={() => setGridStart((start) => start + WINDOW_SIZE)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {years.map((year) => {
              const isSelected = year === value;
              const isCurrent = year === todayYear;

              return (
                <button
                  key={year}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => pickYear(year)}
                  className={cn(
                    "flex h-[54px] flex-col items-center justify-center gap-px rounded-xl border-2 text-sm font-medium transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCurrent
                        ? "border-primary/50 bg-primary/5 text-foreground"
                        : "border-border text-foreground hover:border-primary hover:bg-primary/5"
                  )}
                >
                  {year}
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
            <span className="text-xs text-muted-foreground">Selected: {value}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onValueChange(todayYear);
                setGridStart(windowStart(todayYear));
                setOpen(false);
              }}
            >
              This year
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Next year"
        onClick={() => onValueChange(value + 1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
