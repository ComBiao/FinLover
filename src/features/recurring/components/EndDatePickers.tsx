"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatEnglishDayMonth, toLocalISODate } from "@/lib/utils";
import {
  formatMonthKey,
  MONTH_NAMES,
  monthKeyLabel,
  parseMonthKey,
  shiftMonthKey,
} from "@/features/homepage/month";
import { parseISODateParts } from "../dateCadence";

// ============================================================================
// Helper Calculations
// ============================================================================

export function getFirstAllowedDayDate(startStr: string, interval: number): string {
  const [sy, sm, sd] = parseISODateParts(startStr);
  const d = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
  d.setDate(d.getDate() + interval);
  return toLocalISODate(d);
}

export function getFirstAllowedWeekDate(startStr: string, interval: number): string {
  const [sy, sm, sd] = parseISODateParts(startStr);
  const d = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
  d.setDate(d.getDate() + interval * 7);
  return toLocalISODate(d);
}

export function getFirstAllowedMonthKey(startStr: string, interval: number): string {
  const [sy, sm] = parseISODateParts(startStr);
  return formatMonthKey(sy, sm + interval);
}

export function getFirstAllowedYear(startStr: string, interval: number): number {
  const [sy] = parseISODateParts(startStr);
  return sy + interval;
}

export function isValidOccurrenceDate(
  dateStr: string,
  startStr: string,
  interval: number,
  unit: "days" | "weeks"
): boolean {
  if (!dateStr || !startStr || dateStr <= startStr) return false;
  const [sy, sm, sd] = parseISODateParts(startStr);
  const [dy, dm, dd] = parseISODateParts(dateStr);
  const startD = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
  const endD = new Date(dy, dm - 1, dd, 0, 0, 0, 0);
  const diffDays = Math.round((endD.getTime() - startD.getTime()) / 86_400_000);
  const stepDays = unit === "days" ? interval : interval * 7;
  return diffDays > 0 && diffDays % stepDays === 0;
}

export function isValidOccurrenceMonth(
  monthKey: string,
  startStr: string,
  interval: number
): boolean {
  if (!monthKey || !startStr) return false;
  const { year: ey, month: em } = parseMonthKey(monthKey);
  const [sy, sm] = parseISODateParts(startStr);
  const startTotal = sy * 12 + (sm - 1);
  const endTotal = ey * 12 + (em - 1);
  const diff = endTotal - startTotal;
  return diff > 0 && diff % interval === 0;
}

export function isValidOccurrenceYear(
  year: number,
  startStr: string,
  interval: number
): boolean {
  if (!year || !startStr) return false;
  const [sy] = parseISODateParts(startStr);
  const diff = year - sy;
  return diff > 0 && diff % interval === 0;
}

// ============================================================================
// 1. Monthly End Picker (Transaction Page Query Style)
// ============================================================================

type MonthlyEndPickerProps = {
  startDate: string;
  intervalN: number;
  value: string; // "YYYY-MM"
  onChange: (monthKey: string) => void;
  className?: string;
};

export function MonthlyEndPicker({
  startDate,
  intervalN,
  value,
  onChange,
  className,
}: MonthlyEndPickerProps) {
  const [open, setOpen] = React.useState(false);

  const [sy, sm] = React.useMemo(() => parseISODateParts(startDate), [startDate]);
  const startTotalMonths = sy * 12 + (sm - 1);
  const firstAllowedTotalMonths = startTotalMonths + intervalN;
  const firstAllowedKey = React.useMemo(
    () => formatMonthKey(Math.floor(firstAllowedTotalMonths / 12), (firstAllowedTotalMonths % 12) + 1),
    [firstAllowedTotalMonths]
  );

  const effectiveValue = React.useMemo(() => {
    if (!value || !isValidOccurrenceMonth(value, startDate, intervalN)) {
      return firstAllowedKey;
    }
    return value;
  }, [value, startDate, intervalN, firstAllowedKey]);

  const [calendarYear, setCalendarYear] = React.useState(() => parseMonthKey(effectiveValue).year);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setCalendarYear(parseMonthKey(effectiveValue).year);
    }
  };

  const isAllowedMonth = React.useCallback(
    (year: number, month: number) => {
      const total = year * 12 + (month - 1);
      const diff = total - startTotalMonths;
      return diff > 0 && diff % intervalN === 0;
    },
    [startTotalMonths, intervalN]
  );

  const canGoPrev = React.useMemo(() => {
    const { year, month } = parseMonthKey(effectiveValue);
    const currentTotal = year * 12 + (month - 1);
    return currentTotal - intervalN >= firstAllowedTotalMonths;
  }, [effectiveValue, firstAllowedTotalMonths, intervalN]);

  const handlePrev = () => {
    if (!canGoPrev) return;
    onChange(shiftMonthKey(effectiveValue, -intervalN));
  };

  const handleNext = () => {
    onChange(shiftMonthKey(effectiveValue, intervalN));
  };

  return (
    <div className={cn("flex items-center gap-0.5 rounded-xl border border-border bg-card p-1 w-fit shadow-xs", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Previous occurrence month"
        disabled={!canGoPrev}
        onClick={handlePrev}
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
              className="min-w-36 gap-1.5 font-semibold text-xs"
            />
          }
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          {monthKeyLabel(effectiveValue)}
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[280px] p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Previous year"
              disabled={calendarYear <= sy}
              onClick={() => setCalendarYear((year) => year - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-bold text-foreground">{calendarYear}</span>
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
              const isSelected = key === effectiveValue;
              const allowed = isAllowedMonth(calendarYear, month);

              return (
                <Button
                  key={name}
                  type="button"
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  disabled={!allowed}
                  onClick={() => {
                    if (allowed) {
                      onChange(key);
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    "h-8 text-xs font-semibold transition-colors",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                    !allowed && "opacity-25 cursor-not-allowed hover:bg-transparent text-muted-foreground",
                    allowed && !isSelected && "hover:bg-muted text-foreground"
                  )}
                >
                  {name.slice(0, 3)}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Next occurrence month"
        onClick={handleNext}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

// ============================================================================
// 2. Yearly End Picker (Transaction Page Query Style)
// ============================================================================

type YearlyEndPickerProps = {
  startDate: string;
  intervalN: number;
  value: number;
  onChange: (year: number) => void;
  className?: string;
};

const WINDOW_SIZE = 12;

export function YearlyEndPicker({
  startDate,
  intervalN,
  value,
  onChange,
  className,
}: YearlyEndPickerProps) {
  const [open, setOpen] = React.useState(false);

  const [sy] = React.useMemo(() => parseISODateParts(startDate), [startDate]);
  const firstAllowedYear = sy + intervalN;

  const effectiveValue = React.useMemo(() => {
    if (!value || !isValidOccurrenceYear(value, startDate, intervalN)) {
      return firstAllowedYear;
    }
    return value;
  }, [value, startDate, intervalN, firstAllowedYear]);

  const [gridStart, setGridStart] = React.useState(
    () => Math.floor((effectiveValue - 2000) / WINDOW_SIZE) * WINDOW_SIZE + 2000
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setGridStart(Math.floor((effectiveValue - 2000) / WINDOW_SIZE) * WINDOW_SIZE + 2000);
    }
  };

  const isAllowedYear = React.useCallback(
    (year: number) => {
      const diff = year - sy;
      return diff > 0 && diff % intervalN === 0;
    },
    [sy, intervalN]
  );

  const canGoPrev = effectiveValue - intervalN >= firstAllowedYear;

  const handlePrev = () => {
    if (!canGoPrev) return;
    onChange(effectiveValue - intervalN);
  };

  const handleNext = () => {
    onChange(effectiveValue + intervalN);
  };

  const years = Array.from({ length: WINDOW_SIZE }, (_, index) => gridStart + index);

  return (
    <div className={cn("flex items-center gap-0.5 rounded-xl border border-border bg-card p-1 w-fit shadow-xs", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Previous occurrence year"
        disabled={!canGoPrev}
        onClick={handlePrev}
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
              className="min-w-32 gap-1.5 font-semibold text-xs"
            />
          }
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          {effectiveValue}
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[280px] p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Earlier years"
              disabled={gridStart <= sy}
              onClick={() => setGridStart((start) => start - WINDOW_SIZE)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-bold text-foreground">
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
              const isSelected = year === effectiveValue;
              const allowed = isAllowedYear(year);

              return (
                <Button
                  key={year}
                  type="button"
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  disabled={!allowed}
                  onClick={() => {
                    if (allowed) {
                      onChange(year);
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    "h-8 text-xs font-semibold transition-colors",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                    !allowed && "opacity-25 cursor-not-allowed hover:bg-transparent text-muted-foreground",
                    allowed && !isSelected && "hover:bg-muted text-foreground"
                  )}
                >
                  {year}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Next occurrence year"
        onClick={handleNext}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

// ============================================================================
// 3. Daily & Weekly End Picker (Only Occurrence Days Clickable)
// ============================================================================

type DailyWeeklyEndPickerProps = {
  startDate: string;
  intervalN: number;
  intervalUnit: "days" | "weeks";
  value: string; // "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  className?: string;
};

export function DailyWeeklyEndPicker({
  startDate,
  intervalN,
  intervalUnit,
  value,
  onChange,
  className,
}: DailyWeeklyEndPickerProps) {
  const [open, setOpen] = React.useState(false);

  const stepDays = intervalUnit === "days" ? intervalN : intervalN * 7;
  const [sy, sm, sd] = React.useMemo(() => parseISODateParts(startDate), [startDate]);
  const startDateObj = React.useMemo(() => new Date(sy, sm - 1, sd, 0, 0, 0, 0), [sy, sm, sd]);

  const firstAllowedObj = React.useMemo(
    () => new Date(startDateObj.getTime() + stepDays * 86_400_000),
    [startDateObj, stepDays]
  );
  const firstAllowedStr = React.useMemo(() => toLocalISODate(firstAllowedObj), [firstAllowedObj]);

  const effectiveValue = React.useMemo(() => {
    if (!value || !isValidOccurrenceDate(value, startDate, intervalN, intervalUnit)) {
      return firstAllowedStr;
    }
    return value;
  }, [value, startDate, intervalN, intervalUnit, firstAllowedStr]);

  const [vy, vm, vd] = parseISODateParts(effectiveValue);
  const valObj = React.useMemo(() => new Date(vy, vm - 1, vd, 0, 0, 0, 0), [vy, vm, vd]);

  const isAllowedDate = React.useCallback(
    (d: Date) => {
      const candidateObj = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const diffMs = candidateObj.getTime() - startDateObj.getTime();
      const diffDays = Math.round(diffMs / 86_400_000);
      return diffDays > 0 && diffDays % stepDays === 0;
    },
    [startDateObj, stepDays]
  );

  const prevObj = React.useMemo(
    () => new Date(valObj.getTime() - stepDays * 86_400_000),
    [valObj, stepDays]
  );
  const canGoPrev = prevObj.getTime() >= firstAllowedObj.getTime();

  const handlePrev = () => {
    if (!canGoPrev) return;
    onChange(toLocalISODate(prevObj));
  };

  const handleNext = () => {
    const nextObj = new Date(valObj.getTime() + stepDays * 86_400_000);
    onChange(toLocalISODate(nextObj));
  };

  const handleOpenChange = setOpen;

  return (
    <div className={cn("flex items-center gap-0.5 rounded-xl border border-border bg-card p-1 w-fit shadow-xs", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Previous occurrence date"
        disabled={!canGoPrev}
        onClick={handlePrev}
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
              className="min-w-36 gap-1.5 font-semibold text-xs"
            />
          }
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          {formatEnglishDayMonth(valObj)} {valObj.getFullYear()}
        </PopoverTrigger>

        <PopoverContent align="start" className="w-auto p-3 shadow-lg">
          <Calendar
            mode="single"
            selected={valObj}
            onSelect={(date) => {
              if (date && isAllowedDate(date)) {
                onChange(toLocalISODate(date));
                setOpen(false);
              }
            }}
            disabled={(date) => !isAllowedDate(date)}
            defaultMonth={valObj}
          />
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Next occurrence date"
        onClick={handleNext}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
