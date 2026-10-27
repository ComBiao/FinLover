"use client";

import * as React from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, toLocalISODate } from "@/lib/utils";
import { parseISODateParts } from "../dateCadence";

export const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const WEEKDAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const WEEKDAY_NAMES_FULL = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

/**
 * Formats YYYY-MM-DD into "D MMM YYYY" (e.g. "14 Apr 2027", "1 Jan 2026")
 */
export function formatDayMonthYear(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = parseISODateParts(isoDate);
  const monthName = SHORT_MONTH_NAMES[m - 1] ?? "";
  return `${d} ${monthName} ${y}`;
}

type StartDatePickerProps = {
  value: string; // ISO date "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  min?: string; // Optional minimum allowed ISO date (e.g. today)
  className?: string;
  id?: string;
  "aria-label"?: string;
};

export function StartDatePicker({
  value,
  onChange,
  min,
  className,
  id = "start-date-picker",
  "aria-label": ariaLabel = "Start Date",
}: StartDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<"days" | "months">("days");

  // Parse current value
  const [vy, vm, vd] = React.useMemo(() => {
    if (!value) {
      const now = new Date();
      return [now.getFullYear(), now.getMonth() + 1, now.getDate()];
    }
    return parseISODateParts(value);
  }, [value]);

  // Current browsing month and year inside calendar popover
  const [calendarYear, setCalendarYear] = React.useState(vy);
  const [calendarMonth, setCalendarMonth] = React.useState(vm); // 1-based (1-12)

  // Keep calendar viewport in sync when popover opens
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setCalendarYear(vy);
      setCalendarMonth(vm);
      setView("days");
    }
  };

  // Weekday of the selected date
  const selectedDateWeekday = React.useMemo(() => {
    const d = new Date(vy, vm - 1, vd);
    return WEEKDAY_NAMES_FULL[d.getDay()] ?? "";
  }, [vy, vm, vd]);

  // Fast stepping: Next/Prev Day
  const handleStepDay = (step: number) => {
    const d = new Date(vy, vm - 1, vd);
    d.setDate(d.getDate() + step);
    const nextIso = toLocalISODate(d);
    if (min && nextIso < min) return;
    onChange(nextIso);
  };

  // Month navigation in days view
  const handlePrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarYear((y) => y - 1);
      setCalendarMonth(12);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarYear((y) => y + 1);
      setCalendarMonth(1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  // Selecting a month from the 12-month grid
  const handleSelectMonth = (month1Based: number) => {
    setCalendarMonth(month1Based);
    // Clamp day if the new month has fewer days (e.g. 31st to 30th)
    const daysInNewMonth = new Date(calendarYear, month1Based, 0).getDate();
    const clampedDay = Math.min(vd, daysInNewMonth);
    const newIso = `${calendarYear}-${String(month1Based).padStart(2, "0")}-${String(
      clampedDay
    ).padStart(2, "0")}`;

    if (!min || newIso >= min) {
      onChange(newIso);
    }
    setView("days");
  };

  // Selecting a specific day in the days view
  const handleSelectDay = (day: number) => {
    const targetIso = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    if (min && targetIso < min) return;
    onChange(targetIso);
    setOpen(false);
  };

  // Quick Presets
  const handleJumpPreset = (monthsOffset: number) => {
    const d = new Date(vy, vm - 1 + monthsOffset, vd);
    const targetIso = toLocalISODate(d);
    if (min && targetIso < min) return;
    onChange(targetIso);
    setCalendarYear(d.getFullYear());
    setCalendarMonth(d.getMonth() + 1);
  };

  // Generate days matrix for calendarMonth & calendarYear
  const calendarDays = React.useMemo(() => {
    const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    const firstDayOfWeek = new Date(calendarYear, calendarMonth - 1, 1).getDay();
    // Monday as first column (0 = Mon, 6 = Sun)
    const startOffset = (firstDayOfWeek + 6) % 7;

    const daysInPrevMonth = new Date(calendarYear, calendarMonth - 1, 0).getDate();

    const cells: Array<{
      day: number;
      isCurrentMonth: boolean;
      isoDate: string;
      disabled: boolean;
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = toLocalISODate(new Date());

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const pDay = daysInPrevMonth - i;
      const prevMonthNum = calendarMonth === 1 ? 12 : calendarMonth - 1;
      const prevYearNum = calendarMonth === 1 ? calendarYear - 1 : calendarYear;
      const iso = `${prevYearNum}-${String(prevMonthNum).padStart(2, "0")}-${String(pDay).padStart(
        2,
        "0"
      )}`;
      cells.push({
        day: pDay,
        isCurrentMonth: false,
        isoDate: iso,
        disabled: true,
        isSelected: false,
        isToday: iso === todayStr,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-${String(day).padStart(
        2,
        "0"
      )}`;
      const isDisabled = Boolean(min && iso < min);
      const isSelected = iso === value;
      cells.push({
        day,
        isCurrentMonth: true,
        isoDate: iso,
        disabled: isDisabled,
        isSelected,
        isToday: iso === todayStr,
      });
    }

    // Next month padding to fill a 6-row or 5-row rectangle (multiple of 7)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonthNum = calendarMonth === 12 ? 1 : calendarMonth + 1;
      const nextYearNum = calendarMonth === 12 ? calendarYear + 1 : calendarYear;
      const iso = `${nextYearNum}-${String(nextMonthNum).padStart(2, "0")}-${String(i).padStart(
        2,
        "0"
      )}`;
      cells.push({
        day: i,
        isCurrentMonth: false,
        isoDate: iso,
        disabled: true,
        isSelected: false,
        isToday: iso === todayStr,
      });
    }

    return cells;
  }, [calendarYear, calendarMonth, value, min]);

  const canStepPrev = !min || value > min;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-1.5 w-full">
        {/* Step Prev Day button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Previous day"
          disabled={!canStepPrev}
          onClick={() => handleStepDay(-1)}
          className="size-11 shrink-0 rounded-xl border-border/80 hover:bg-muted active:scale-95 transition"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/* Large Prominent Trigger Button */}
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger
            render={
              <button
                type="button"
                id={id}
                aria-label="Open calendar"
                className={cn(
                  "group h-11 flex-1 px-3.5 flex items-center justify-between rounded-xl border border-border/80 bg-card hover:bg-accent/40 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-all shadow-xs cursor-pointer text-left"
                )}
              />
            }
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                <CalendarDays className="size-4" />
              </div>
              <div className="min-w-0 flex items-baseline gap-2">
                {/* Main Display: day month year (e.g. "14 Apr 2027") */}
                <span className="text-sm font-bold text-foreground tracking-tight">
                  {formatDayMonthYear(value)}
                </span>
                {/* Weekday badge */}
                <span className="text-xs text-muted-foreground font-medium truncate">
                  · {selectedDateWeekday}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground shrink-0 pl-1">
              <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180 text-primary")} />
            </div>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-[min(330px,calc(100vw-2rem))] p-3.5 shadow-2xl rounded-2xl border border-border/80 bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95"
          >
            {/* Header: Mode Switcher & Stepper */}
            <div className="flex items-center justify-between pb-2.5 border-b border-border/50">
              {view === "days" ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Previous month"
                    onClick={handlePrevMonth}
                    className="size-8 rounded-lg hover:bg-muted"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>

                  {/* Click to open 12-month selection grid */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setView("months")}
                    className="h-8 px-2.5 rounded-lg font-bold text-xs gap-1.5 border-border/70 hover:border-primary hover:bg-primary/5 hover:text-primary transition"
                  >
                    <CalendarDays className="size-3.5 text-primary" />
                    <span>{FULL_MONTH_NAMES[calendarMonth - 1]} {calendarYear}</span>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Next month"
                    onClick={handleNextMonth}
                    className="size-8 rounded-lg hover:bg-muted"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </>
              ) : (
                /* Month Selector Header with Year Navigation */
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Previous year"
                    onClick={() => setCalendarYear((y) => y - 1)}
                    className="size-8 rounded-lg hover:bg-muted"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Select Month ·
                    </span>
                    <span className="text-sm font-extrabold text-foreground font-mono">
                      {calendarYear}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Next year"
                    onClick={() => setCalendarYear((y) => y + 1)}
                    className="size-8 rounded-lg hover:bg-muted"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </>
              )}
            </div>

            {/* VIEW 1: 12-MONTH GRID (Super easy 1-click month jump) */}
            {view === "months" && (
              <div className="pt-3 space-y-2.5">
                <div className="grid grid-cols-3 gap-1.5">
                  {SHORT_MONTH_NAMES.map((name, index) => {
                    const monthNum = index + 1;
                    const isSelectedMonth =
                      calendarYear === vy && monthNum === vm;
                    const isCurrentCalendarMonth = monthNum === calendarMonth;

                    return (
                      <Button
                        key={name}
                        type="button"
                        variant={isSelectedMonth ? "default" : isCurrentCalendarMonth ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleSelectMonth(monthNum)}
                        className={cn(
                          "h-10 text-xs font-bold rounded-xl transition-all",
                          isSelectedMonth
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : isCurrentCalendarMonth
                            ? "border border-primary/40 text-primary font-extrabold"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        {name}
                      </Button>
                    );
                  })}
                </div>

                <div className="pt-1 flex items-center justify-between border-t border-border/40">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setView("days")}
                    className="text-xs h-7 px-2 font-medium text-muted-foreground hover:text-foreground"
                  >
                    Back to Days
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const now = new Date();
                      setCalendarYear(now.getFullYear());
                      setCalendarMonth(now.getMonth() + 1);
                      setView("days");
                    }}
                    className="text-xs h-7 px-2 font-semibold text-primary hover:bg-primary/10"
                  >
                    Current Month
                  </Button>
                </div>
              </div>
            )}

            {/* VIEW 2: DAYS CALENDAR WITH QUICK PRESETS */}
            {view === "days" && (
              <div className="pt-2.5 space-y-2">
                {/* Desktop Quick Jump Presets */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => {
                      const todayStr = toLocalISODate(new Date());
                      if (!min || todayStr >= min) {
                        onChange(todayStr);
                        const [ty, tm] = parseISODateParts(todayStr);
                        setCalendarYear(ty);
                        setCalendarMonth(tm);
                      }
                    }}
                    className="h-6 px-2 text-[10px] font-semibold rounded-md shrink-0 bg-muted/80 hover:bg-primary/10 hover:text-primary transition"
                  >
                    <Clock className="size-2.5 mr-1 text-primary" />
                    Today
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => handleJumpPreset(1)}
                    className="h-6 px-2 text-[10px] font-semibold rounded-md shrink-0 bg-muted/80 hover:bg-primary/10 hover:text-primary transition"
                  >
                    +1 Mo
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => handleJumpPreset(3)}
                    className="h-6 px-2 text-[10px] font-semibold rounded-md shrink-0 bg-muted/80 hover:bg-primary/10 hover:text-primary transition"
                  >
                    +3 Mos
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => setView("months")}
                    className="h-6 px-2 text-[10px] font-bold text-primary rounded-md shrink-0 ml-auto bg-primary/10 hover:bg-primary/20 transition"
                  >
                    Pick Month
                  </Button>
                </div>

                {/* Day of Week Header: Mon-Sun */}
                <div className="grid grid-cols-7 gap-1 text-center py-1">
                  {WEEKDAY_NAMES_SHORT.map((w) => (
                    <span
                      key={w}
                      className="text-[11px] font-bold text-muted-foreground/80 tracking-tight"
                    >
                      {w}
                    </span>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((cell, idx) => {
                    if (!cell.isCurrentMonth) {
                      return (
                        <div
                          key={`pad-${idx}`}
                          className="h-8 flex items-center justify-center text-xs text-muted-foreground/25 select-none"
                        >
                          {cell.day}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={cell.isoDate}
                        type="button"
                        disabled={cell.disabled}
                        onClick={() => handleSelectDay(cell.day)}
                        className={cn(
                          "h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer relative",
                          cell.isSelected
                            ? "bg-primary text-primary-foreground font-extrabold shadow-sm scale-105"
                            : cell.isToday
                            ? "border border-primary text-primary font-bold hover:bg-primary/10"
                            : cell.disabled
                            ? "opacity-25 cursor-not-allowed hover:bg-transparent text-muted-foreground"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        {cell.day}
                        {cell.isToday && !cell.isSelected && (
                          <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Step Next Day button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Next day"
          onClick={() => handleStepDay(1)}
          className="size-11 shrink-0 rounded-xl border-border/80 hover:bg-muted active:scale-95 transition"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Accessible/programmatic native input for Playwright E2E and automated testing */}
      <input
        type="date"
        aria-label={ariaLabel}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}
