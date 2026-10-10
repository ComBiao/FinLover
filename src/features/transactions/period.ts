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

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** A date in the given year/month with `day` clamped to that month's length (31 → 28 in February). */
function clampedDate(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, Math.min(day, daysInMonth(year, monthIndex)));
}

/**
 * The period a mode switch lands on. `anchor` is stored separately from the
 * period and only moves when the user navigates, so Month → Year → Month
 * returns to the same month instead of drifting.
 */
export function periodFromAnchor(anchor: Date, mode: PeriodMode): TransactionPeriod {
  if (mode === "month") {
    return { mode: "month", monthKey: formatMonthKey(anchor.getFullYear(), anchor.getMonth() + 1) };
  }
  if (mode === "year") return { mode: "year", year: anchor.getFullYear() };
  return { mode: "day", from: anchor, to: anchor };
}

/**
 * The new anchor after the user navigates to `period` (‹ ›, or picking a
 * month/year/range): month and year keep the previous anchor's day (and month,
 * for a year), clamped to the target month's length; a day range anchors on
 * its end date.
 */
export function anchorFromPeriod(period: TransactionPeriod, previousAnchor: Date): Date {
  if (period.mode === "day") return period.to;
  if (period.mode === "month") {
    const { year, month } = parseMonthKey(period.monthKey);
    return clampedDate(year, month - 1, previousAnchor.getDate());
  }
  return clampedDate(period.year, previousAnchor.getMonth(), previousAnchor.getDate());
}

/** Today at local midnight — the anchor on page load and after Reset Filters. */
export function todayAnchor(): Date {
  return today();
}
