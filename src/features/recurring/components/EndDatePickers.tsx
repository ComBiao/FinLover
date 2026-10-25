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

  const prevStartRef = React.useRef(startDate);
  const prevIntervalRef = React.useRef(intervalN);

  React.useEffect(() => {
    const startChanged = prevStartRef.current !== startDate;
    const intervalChanged = prevIntervalRef.current !== intervalN;
    prevStartRef.current = startDate;
    prevIntervalRef.current = intervalN;

    if (!value || startChanged || intervalChanged) {
      if (effectiveValue !== value) {
        onChange(effectiveValue);
      }
    }
  }, [startDate, intervalN, effectiveValue, value, onChange]);

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

  const prevStartRef = React.useRef(startDate);
  const prevIntervalRef = React.useRef(intervalN);

  React.useEffect(() => {
    const startChanged = prevStartRef.current !== startDate;
    const intervalChanged = prevIntervalRef.current !== intervalN;
    prevStartRef.current = startDate;
    prevIntervalRef.current = intervalN;

    if (!value || startChanged || intervalChanged) {
      if (effectiveValue !== value) {
        onChange(effectiveValue);
      }
    }
  }, [startDate, intervalN, effectiveValue, value, onChange]);

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

  const firstAllowedObj = React.useMemo(() => {
    const d = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate(), 0, 0, 0, 0);
    d.setDate(d.getDate() + stepDays);
    return d;
  }, [startDateObj, stepDays]);
  const firstAllowedStr = React.useMemo(() => toLocalISODate(firstAllowedObj), [firstAllowedObj]);

  const effectiveValue = React.useMemo(() => {
    if (!value || !isValidOccurrenceDate(value, startDate, intervalN, intervalUnit)) {
      return firstAllowedStr;
    }
    return value;
  }, [value, startDate, intervalN, intervalUnit, firstAllowedStr]);

  const prevStartRef = React.useRef(startDate);
  const prevIntervalRef = React.useRef(intervalN);
  const prevUnitRef = React.useRef(intervalUnit);

  React.useEffect(() => {
    const startChanged = prevStartRef.current !== startDate;
    const intervalChanged = prevIntervalRef.current !== intervalN;
    const unitChanged = prevUnitRef.current !== intervalUnit;
    prevStartRef.current = startDate;
    prevIntervalRef.current = intervalN;
    prevUnitRef.current = intervalUnit;

    if (!value || startChanged || intervalChanged || unitChanged) {
      if (effectiveValue !== value) {
        onChange(effectiveValue);
      }
    }
  }, [startDate, intervalN, intervalUnit, effectiveValue, value, onChange]);

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

  const prevObj = React.useMemo(() => {
    const d = new Date(valObj.getFullYear(), valObj.getMonth(), valObj.getDate(), 0, 0, 0, 0);
    d.setDate(d.getDate() - stepDays);
    return d;
  }, [valObj, stepDays]);
  const canGoPrev = prevObj.getTime() >= firstAllowedObj.getTime();

  const handlePrev = () => {
    if (!canGoPrev) return;
    onChange(toLocalISODate(prevObj));
  };

  const handleNext = () => {
    const nextObj = new Date(valObj.getFullYear(), valObj.getMonth(), valObj.getDate(), 0, 0, 0, 0);
    nextObj.setDate(nextObj.getDate() + stepDays);
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

// ============================================================================
// 4. Weekly iPhone Clock Wheel Picker (Dual Drum Roller: Month + Week Occurrence)
// ============================================================================

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
const DRUM_ITEM_HEIGHT = 36;
const DRUM_VISIBLE_ROWS = 5;
const DRUM_VIEWPORT_HEIGHT = DRUM_ITEM_HEIGHT * DRUM_VISIBLE_ROWS; // 180px
const DRUM_PADDING_OFFSET = (DRUM_VIEWPORT_HEIGHT - DRUM_ITEM_HEIGHT) / 2; // 72px

type OccurrenceItem = {
  isoDate: string;
  occurrenceNum: number;
  weeksFromStart: number;
  weekLabel: string;
  weekday: string;
  dayNum: number;
  dayMonth: string;
  year: number;
  monthKey: string;
};

type MonthGroup = {
  monthKey: string;
  shortMonth: string;
  year: number;
  month: number;
  occurrences: OccurrenceItem[];
};

type WeeklyIphoneClockPickerProps = {
  startDate: string;
  intervalN: number;
  value: string; // "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  className?: string;
};

export function WeeklyIphoneClockPicker({
  startDate,
  intervalN,
  value,
  onChange,
  className,
}: WeeklyIphoneClockPickerProps) {
  const stepDays = Math.max(1, intervalN) * 7;
  const [sy, sm, sd] = React.useMemo(() => parseISODateParts(startDate), [startDate]);
  const startDateObj = React.useMemo(() => new Date(sy, sm - 1, sd, 0, 0, 0, 0), [sy, sm, sd]);

  // Generate 156 weekly occurrences (up to 3 years) and group by month
  const { monthGroups, allOccurrences } = React.useMemo(() => {
    const occList: OccurrenceItem[] = [];
    const groupMap = new Map<string, MonthGroup>();

    for (let k = 1; k <= 156; k++) {
      const d = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate(), 0, 0, 0, 0);
      d.setDate(d.getDate() + k * stepDays);
      const isoDate = toLocalISODate(d);
      const weeksFromStart = k * Math.max(1, intervalN);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const monthKey = formatMonthKey(year, month);
      const shortMonth = SHORT_MONTH_NAMES[month - 1];

      const item: OccurrenceItem = {
        isoDate,
        occurrenceNum: k,
        weeksFromStart,
        weekLabel: intervalN === 1 ? `Week ${k}` : `Wk ${weeksFromStart}`,
        weekday: WEEKDAY_NAMES[d.getDay()],
        dayNum: d.getDate(),
        dayMonth: formatEnglishDayMonth(d),
        year,
        monthKey,
      };

      occList.push(item);

      if (!groupMap.has(monthKey)) {
        groupMap.set(monthKey, {
          monthKey,
          shortMonth,
          year,
          month,
          occurrences: [],
        });
      }
      groupMap.get(monthKey)!.occurrences.push(item);
    }

    return {
      monthGroups: Array.from(groupMap.values()),
      allOccurrences: occList,
    };
  }, [startDateObj, stepDays, intervalN]);

  // Determine active month
  const targetMonthKey = value ? value.slice(0, 7) : monthGroups[0]?.monthKey;
  const activeMonthIndex = React.useMemo(() => {
    if (!targetMonthKey) return 0;
    const idx = monthGroups.findIndex((m) => m.monthKey === targetMonthKey);
    return idx >= 0 ? idx : 0;
  }, [monthGroups, targetMonthKey]);

  const activeMonth = monthGroups[activeMonthIndex] ?? monthGroups[0];

  // Determine active occurrence within the active month
  const activeOccIndex = React.useMemo(() => {
    if (!value || !activeMonth) return 0;
    const idx = activeMonth.occurrences.findIndex((o) => o.isoDate === value);
    return idx >= 0 ? idx : 0;
  }, [activeMonth, value]);

  const selectedItem = activeMonth?.occurrences[activeOccIndex] ?? allOccurrences[0];

  const prevStartRef = React.useRef(startDate);
  const prevIntervalRef = React.useRef(intervalN);

  React.useEffect(() => {
    const startChanged = prevStartRef.current !== startDate;
    const intervalChanged = prevIntervalRef.current !== intervalN;
    prevStartRef.current = startDate;
    prevIntervalRef.current = intervalN;

    if (!value || startChanged || intervalChanged) {
      if (selectedItem && selectedItem.isoDate !== value) {
        onChange(selectedItem.isoDate);
      }
    }
  }, [startDate, intervalN, selectedItem, value, onChange]);

  // Scroll refs
  const monthScrollRef = React.useRef<HTMLDivElement>(null);
  const dayScrollRef = React.useRef<HTMLDivElement>(null);
  const isMonthScrollingRef = React.useRef(false);
  const isDayScrollingRef = React.useRef(false);
  const monthScrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const dayScrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Popover state for quick month grid selection
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [popoverYear, setPopoverYear] = React.useState(() => activeMonth?.year ?? sy);

  const handleOpenPopover = (open: boolean) => {
    if (open && activeMonth) {
      setPopoverYear(activeMonth.year);
    }
    setPopoverOpen(open);
  };

  // Synchronize month scroll position
  React.useEffect(() => {
    if (monthScrollRef.current && !isMonthScrollingRef.current) {
      monthScrollRef.current.scrollTop = activeMonthIndex * DRUM_ITEM_HEIGHT;
    }
  }, [activeMonthIndex]);

  // Synchronize day scroll position
  React.useEffect(() => {
    if (dayScrollRef.current && !isDayScrollingRef.current) {
      dayScrollRef.current.scrollTop = activeOccIndex * DRUM_ITEM_HEIGHT;
    }
  }, [activeOccIndex, activeMonthIndex]);

  // Clean up timeouts
  React.useEffect(() => {
    return () => {
      if (monthScrollTimeoutRef.current) clearTimeout(monthScrollTimeoutRef.current);
      if (dayScrollTimeoutRef.current) clearTimeout(dayScrollTimeoutRef.current);
    };
  }, []);

  const selectMonthIndex = React.useCallback(
    (targetIndex: number) => {
      const clamped = Math.max(0, Math.min(monthGroups.length - 1, targetIndex));
      if (monthScrollRef.current) {
        isMonthScrollingRef.current = false;
        if (typeof monthScrollRef.current.scrollTo === "function") {
          monthScrollRef.current.scrollTo({
            top: clamped * DRUM_ITEM_HEIGHT,
            behavior: "smooth",
          });
        } else {
          monthScrollRef.current.scrollTop = clamped * DRUM_ITEM_HEIGHT;
        }
      }

      const targetGroup = monthGroups[clamped];
      if (targetGroup && targetGroup.occurrences.length > 0) {
        // Keep similar occurrence index within month if available
        const targetOccIdx = Math.min(activeOccIndex, targetGroup.occurrences.length - 1);
        const targetOcc = targetGroup.occurrences[targetOccIdx];
        if (targetOcc && targetOcc.isoDate !== value) {
          onChange(targetOcc.isoDate);
        }
      }
    },
    [monthGroups, activeOccIndex, value, onChange]
  );

  const selectOccurrenceIndex = React.useCallback(
    (targetIndex: number) => {
      if (!activeMonth) return;
      const clamped = Math.max(0, Math.min(activeMonth.occurrences.length - 1, targetIndex));
      if (dayScrollRef.current) {
        isDayScrollingRef.current = false;
        if (typeof dayScrollRef.current.scrollTo === "function") {
          dayScrollRef.current.scrollTo({
            top: clamped * DRUM_ITEM_HEIGHT,
            behavior: "smooth",
          });
        } else {
          dayScrollRef.current.scrollTop = clamped * DRUM_ITEM_HEIGHT;
        }
      }

      const targetOcc = activeMonth.occurrences[clamped];
      if (targetOcc && targetOcc.isoDate !== value) {
        onChange(targetOcc.isoDate);
      }
    },
    [activeMonth, value, onChange]
  );

  const handleMonthScroll = (e: React.UIEvent<HTMLDivElement>) => {
    isMonthScrollingRef.current = true;
    const scrollTop = e.currentTarget.scrollTop;
    const approxIndex = Math.round(scrollTop / DRUM_ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(monthGroups.length - 1, approxIndex));

    if (monthScrollTimeoutRef.current) {
      clearTimeout(monthScrollTimeoutRef.current);
    }

    monthScrollTimeoutRef.current = setTimeout(() => {
      isMonthScrollingRef.current = false;
      if (clamped !== activeMonthIndex) {
        selectMonthIndex(clamped);
      }
    }, 120);
  };

  const handleDayScroll = (e: React.UIEvent<HTMLDivElement>) => {
    isDayScrollingRef.current = true;
    const scrollTop = e.currentTarget.scrollTop;
    const approxIndex = Math.round(scrollTop / DRUM_ITEM_HEIGHT);
    if (!activeMonth) return;
    const clamped = Math.max(0, Math.min(activeMonth.occurrences.length - 1, approxIndex));

    if (dayScrollTimeoutRef.current) {
      clearTimeout(dayScrollTimeoutRef.current);
    }

    dayScrollTimeoutRef.current = setTimeout(() => {
      isDayScrollingRef.current = false;
      if (clamped !== activeOccIndex) {
        selectOccurrenceIndex(clamped);
      }
    }, 120);
  };

  // Jump to specific month (from popover or quick presets)
  const jumpToMonthKey = (mKey: string) => {
    const idx = monthGroups.findIndex((m) => m.monthKey === mKey);
    if (idx >= 0) {
      selectMonthIndex(idx);
    }
  };

  // Quick jump presets
  const jumpPresets = [
    { label: "+1 Mo", months: 1 },
    { label: "+3 Mos", months: 3 },
    { label: "+6 Mos", months: 6 },
    { label: "+1 Yr", months: 12 },
  ];

  const handlePresetJump = (monthsOffset: number) => {
    const targetIdx = Math.min(monthGroups.length - 1, activeMonthIndex + monthsOffset);
    selectMonthIndex(targetIdx);
  };

  return (
    <div
      role="region"
      aria-label="Weekly end date iPhone clock wheel selector"
      className={cn(
        "flex flex-col rounded-2xl border border-border/80 bg-card p-3 shadow-xs w-[320px] max-w-full select-none space-y-2.5",
        className
      )}
    >
      {/* Header with Month Selector Popover & Stepper Buttons */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous occurrence month"
          disabled={activeMonthIndex <= 0}
          onClick={() => selectMonthIndex(activeMonthIndex - 1)}
          className="size-7"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/* Center: Interactive Month Popover Trigger */}
        <div className="text-center">
          <Popover open={popoverOpen} onOpenChange={handleOpenPopover}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-bold text-foreground hover:text-primary transition-colors cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-muted"
                  aria-label="Select month"
                />
              }
            >
              <CalendarDays className="size-3.5 text-muted-foreground" />
              <span>
                {activeMonth?.shortMonth} {activeMonth?.year}
              </span>
            </PopoverTrigger>

            <PopoverContent align="center" className="w-56 p-2.5 shadow-lg">
              {/* Year Nav inside Popover */}
              <div className="flex items-center justify-between border-b border-border/60 pb-1.5 mb-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Previous year"
                  disabled={popoverYear <= sy}
                  onClick={() => setPopoverYear((y) => y - 1)}
                  className="size-6"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <span className="text-xs font-bold text-foreground">{popoverYear}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Next year"
                  onClick={() => setPopoverYear((y) => y + 1)}
                  className="size-6"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>

              {/* 12-Month Grid */}
              <div className="grid grid-cols-3 gap-1">
                {SHORT_MONTH_NAMES.map((mName, mIdx) => {
                  const mNum = mIdx + 1;
                  const mKey = formatMonthKey(popoverYear, mNum);
                  const isAvailable = monthGroups.some((mg) => mg.monthKey === mKey);
                  const isCurrent = activeMonth?.monthKey === mKey;

                  return (
                    <Button
                      key={mName}
                      type="button"
                      variant={isCurrent ? "default" : "ghost"}
                      size="sm"
                      disabled={!isAvailable}
                      onClick={() => {
                        jumpToMonthKey(mKey);
                        setPopoverOpen(false);
                      }}
                      className={cn(
                        "h-7 text-xs font-medium transition-colors",
                        isCurrent && "bg-primary text-primary-foreground font-bold",
                        !isAvailable && "opacity-25 cursor-not-allowed text-muted-foreground"
                      )}
                    >
                      {mName}
                    </Button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Subtitle with selected date & occurrence */}
          <div className="text-[10px] text-muted-foreground font-medium">
            {selectedItem?.weekday}, {selectedItem?.dayMonth} · {selectedItem?.weekLabel}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Next occurrence month"
          disabled={activeMonthIndex >= monthGroups.length - 1}
          onClick={() => selectMonthIndex(activeMonthIndex + 1)}
          className="size-7"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Dual Drum Viewport: Month Drum (Left) + Day/Occurrence Drum (Right) */}
      <div
        className="relative flex items-center justify-between overflow-hidden rounded-xl bg-muted/30 dark:bg-zinc-950/40 border border-border/40"
        style={{ height: DRUM_VIEWPORT_HEIGHT }}
        role="group"
        aria-label="Month and day wheels"
      >
        {/* Top 3D Cylinder Gradient Fade */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-card dark:from-zinc-950 via-card/75 to-transparent z-10"
          aria-hidden="true"
        />

        {/* Center Selection Lens Overlay spanning across both wheels */}
        <div
          className="pointer-events-none absolute inset-x-1.5 h-[36px] rounded-lg border-y border-border/80 bg-primary/10 shadow-xs dark:bg-primary/15 z-5"
          style={{ top: DRUM_PADDING_OFFSET }}
          aria-hidden="true"
        />

        {/* Bottom 3D Cylinder Gradient Fade */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card dark:from-zinc-950 via-card/75 to-transparent z-10"
          aria-hidden="true"
        />

        {/* Left Wheel: Month Drum */}
        <div
          ref={monthScrollRef}
          onScroll={handleMonthScroll}
          className="h-full w-[128px] overflow-y-auto snap-y snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [scrollbar-width:none] z-6"
          style={{
            paddingTop: DRUM_PADDING_OFFSET,
            paddingBottom: DRUM_PADDING_OFFSET,
          }}
          aria-label="Month wheel"
        >
          {monthGroups.map((m, idx) => {
            const dist = Math.abs(idx - activeMonthIndex);
            const isSelected = dist === 0;

            return (
              <div
                key={m.monthKey}
                role="button"
                tabIndex={-1}
                aria-pressed={isSelected}
                aria-label={`Month ${m.shortMonth} ${m.year}`}
                onClick={() => selectMonthIndex(idx)}
                className={cn(
                  "snap-center h-[36px] flex items-center justify-center px-2 w-full cursor-pointer transition-all duration-150",
                  isSelected && "font-bold text-foreground text-sm scale-100",
                  dist === 1 && "font-medium text-muted-foreground text-xs scale-95 opacity-60",
                  dist >= 2 && "font-normal text-muted-foreground/50 text-[11px] scale-90 opacity-25"
                )}
              >
                <span>
                  {m.shortMonth} {m.year}
                </span>
              </div>
            );
          })}
        </div>

        {/* Subtle Vertical Divider between Month and Day Wheels */}
        <div className="h-[120px] w-px bg-border/40 z-6 mx-0.5" aria-hidden="true" />

        {/* Right Wheel: Day & Week Occurrence Drum */}
        <div
          ref={dayScrollRef}
          onScroll={handleDayScroll}
          className="h-full w-[158px] overflow-y-auto snap-y snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [scrollbar-width:none] z-6"
          style={{
            paddingTop: DRUM_PADDING_OFFSET,
            paddingBottom: DRUM_PADDING_OFFSET,
          }}
          aria-label="Occurrence day wheel"
        >
          {activeMonth?.occurrences.map((occ, idx) => {
            const dist = Math.abs(idx - activeOccIndex);
            const isSelected = dist === 0;

            return (
              <div
                key={occ.isoDate}
                role="button"
                tabIndex={-1}
                aria-pressed={isSelected}
                aria-label={`${occ.weekLabel}: ${occ.weekday}, ${occ.dayMonth} ${occ.year}`}
                onClick={() => selectOccurrenceIndex(idx)}
                className={cn(
                  "snap-center h-[36px] flex items-center justify-between px-3 w-full cursor-pointer transition-all duration-150",
                  isSelected && "font-bold text-foreground text-sm scale-100",
                  dist === 1 && "font-medium text-muted-foreground text-xs scale-95 opacity-60",
                  dist >= 2 && "font-normal text-muted-foreground/50 text-[11px] scale-90 opacity-25"
                )}
              >
                <span className="text-xs font-semibold">
                  {occ.weekday} {occ.dayNum}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground/80">
                  {occ.weekLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Jump Month Presets */}
      <div className="flex items-center justify-center gap-1.5 pt-0.5">
        {jumpPresets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePresetJump(preset.months)}
            className="rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors border bg-muted/60 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

