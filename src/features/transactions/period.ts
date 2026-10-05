import { todayISODate } from "@/lib/utils";
import {
  currentMonthKey,
  formatMonthKey,
  monthKeyLabel,
  parseMonthKey,
  shiftMonthKey,
  type MonthKey,
} from "@/features/homepage/month";
import type { DateRange } from "@/types/dateRange";

export type PeriodMode = "day" | "month" | "year";

/** The Transactions page's time filter: a whole month, a whole year, or an explicit day range. */
export type TransactionPeriod =
  | { mode: "month"; monthKey: MonthKey }
  | { mode: "year"; year: number }
  | { mode: "day"; from: Date; to: Date };

function today(): Date {
  const [year, month, day] = todayISODate().split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Default period on page load / after Reset Filters: the current month. */
export function currentPeriod(): TransactionPeriod {
  return { mode: "month", monthKey: currentMonthKey() };
}

/**
 * The inclusive {from, to} range a period covers. `to` is left at local
 * midnight rather than end-of-day — `filterTransactions` already applies its
 * own end-of-day padding to `dateRange.to`.
 */
export function periodToDateRange(period: TransactionPeriod): DateRange {
  if (period.mode === "month") {
    const { year, month } = parseMonthKey(period.monthKey);
    return { from: new Date(year, month - 1, 1), to: new Date(year, month, 0) };
  }
  if (period.mode === "year") {
    return { from: new Date(period.year, 0, 1), to: new Date(period.year, 11, 31) };
  }
  return { from: period.from, to: period.to };
}

function shortDate(date: Date) {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** "October 2026" / "2026" / "Oct 4, 2026" / "Sep 28 – Oct 4, 2026". */
export function periodLabel(period: TransactionPeriod): string {
  if (period.mode === "month") return monthKeyLabel(period.monthKey);
  if (period.mode === "year") return String(period.year);

  const { from, to } = period;
  if (from.toDateString() === to.toDateString()) {
    return `${shortDate(from)}, ${from.getFullYear()}`;
  }
  return from.getFullYear() === to.getFullYear()
    ? `${shortDate(from)} – ${shortDate(to)}, ${to.getFullYear()}`
    : `${shortDate(from)}, ${from.getFullYear()} – ${shortDate(to)}, ${to.getFullYear()}`;
}

const MS_PER_DAY = 86_400_000;

/** Whole-day number (UTC-anchored, so it's immune to DST shifts), matching the pattern used for month keys. */
function dayNumber(date: Date) {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY);
}

function fromDayNumber(n: number) {
  const date = new Date(n * MS_PER_DAY);
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Shifts a day range by its own length — a single day moves 1 day, a 7-day range moves 7 days. */
export function shiftDayRange(range: { from: Date; to: Date }, direction: 1 | -1): { from: Date; to: Date } {
  const length = dayNumber(range.to) - dayNumber(range.from) + 1;
  const delta = direction * length;
  return {
    from: fromDayNumber(dayNumber(range.from) + delta),
    to: fromDayNumber(dayNumber(range.to) + delta),
  };
}

/** Moves one period at a time: ±1 month, ±1 year, or ±the current day range's length. No limit on past/future. */
export function shiftPeriod(period: TransactionPeriod, direction: 1 | -1): TransactionPeriod {
  if (period.mode === "month") {
    return { mode: "month", monthKey: shiftMonthKey(period.monthKey, direction) };
  }
  if (period.mode === "year") {
    return { mode: "year", year: period.year + direction };
  }
  return { mode: "day", ...shiftDayRange(period, direction) };
}

function dateToMonthKey(date: Date): MonthKey {
  return formatMonthKey(date.getFullYear(), date.getMonth() + 1);
}

/**
 * The date a period is "anchored" on: today, when the period is the current
 * month/year, otherwise the 1st of that month/year (or the range's end date,
 * for a day range). Used so switching modes keeps the same point in time
 * instead of jumping back to today.
 */
function anchorDate(period: TransactionPeriod): Date {
  if (period.mode === "day") return period.to;

  const now = today();
  if (period.mode === "month") {
    if (period.monthKey === currentMonthKey()) return now;
    const { year, month } = parseMonthKey(period.monthKey);
    return new Date(year, month - 1, 1);
  }
  return period.year === now.getFullYear() ? now : new Date(period.year, 0, 1);
}

/** Switches mode while keeping "the current date" as the anchor (e.g. September 2026 → Year = 2026). */
export function switchPeriodMode(period: TransactionPeriod, mode: PeriodMode): TransactionPeriod {
  if (period.mode === mode) return period;
  const anchor = anchorDate(period);
  if (mode === "month") return { mode: "month", monthKey: dateToMonthKey(anchor) };
  if (mode === "year") return { mode: "year", year: anchor.getFullYear() };
  return { mode: "day", from: anchor, to: anchor };
}
