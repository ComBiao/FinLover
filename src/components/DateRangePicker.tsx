"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange, DateRangePreset } from "@/types/dateRange";

const PRESETS: { value: Exclude<DateRangePreset, "custom">; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
];

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function getPresetRange(preset: Exclude<DateRangePreset, "custom">): DateRange {
  const now = new Date();

  if (preset === "today") {
    return { from: startOfDay(now), to: endOfDay(now) };
  }

  if (preset === "this_week") {
    const daysSinceMonday = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysSinceMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: startOfDay(monday), to: endOfDay(sunday) };
  }

  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: startOfDay(firstOfMonth), to: endOfDay(lastOfMonth) };
}

function isSameDay(a?: Date, b?: Date) {
  return a?.toDateString() === b?.toDateString();
}

function isSameRange(a: DateRange, b: DateRange) {
  return isSameDay(a.from, b.from) && isSameDay(a.to, b.to);
}

/**
 * Which preset (if any) a range matches — used to highlight the active
 * button. Recomputes each preset's range from `new Date()` on every call, so
 * a selection made e.g. as "Today" stops matching once the view is left open
 * past midnight.
 */
function getActivePreset(value?: DateRange): DateRangePreset | undefined {
  if (!value?.from && !value?.to) return undefined;
  const matched = PRESETS.find(({ value: preset }) => isSameRange(value, getPresetRange(preset)));
  return matched?.value ?? "custom";
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function formatRangeLabel(value?: DateRange) {
  if (!value?.from && !value?.to) return "Custom range";
  if (value.from && value.to) return `${formatDate(value.from)} - ${formatDate(value.to)}`;
  if (value.from) return `${formatDate(value.from)} - ...`;
  return `... - ${formatDate(value.to!)}`;
}

type DateRangePickerProps = {
  value?: DateRange;
  onValueChange?: (range: DateRange | undefined) => void;
  className?: string;
  disabled?: boolean;
};

/**
 * Quick date-range filter: Today / This Week / This Month presets, plus a
 * Custom option that opens a calendar for picking an arbitrary start/end
 * date. The active preset button is derived from `value` rather than
 * tracked separately, so an externally-set range still highlights correctly.
 */
export function DateRangePicker({
  value,
  onValueChange,
  className,
  disabled,
}: DateRangePickerProps) {
  const [isCustomOpen, setIsCustomOpen] = React.useState(false);
  const activePreset = getActivePreset(value);

  function handlePresetClick(preset: Exclude<DateRangePreset, "custom">) {
    onValueChange?.(getPresetRange(preset));
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {PRESETS.map(({ value: preset, label }) => (
        <Button
          key={preset}
          type="button"
          size="sm"
          variant={activePreset === preset ? "default" : "outline"}
          disabled={disabled}
          onClick={() => handlePresetClick(preset)}
        >
          {label}
        </Button>
      ))}

      <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant={activePreset === "custom" ? "default" : "outline"}
              disabled={disabled}
            />
          }
        >
          <CalendarDays className="size-4" />
          {activePreset === "custom" ? formatRangeLabel(value) : "Custom"}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="range"
            selected={{ from: value?.from, to: value?.to }}
            onSelect={(range) => onValueChange?.(range)}
            defaultMonth={value?.from}
            numberOfMonths={2}
            disabled={disabled}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
