import { formatEnglishDate, formatEnglishDayMonth, toLocalISODate } from "@/lib/utils";
import type { ReportInterval } from "@/features/reports/types";

/** Weekly = this Monday–Sunday, Monthly = this calendar month, Annual = this year, Custom = two free dates. */
export type ReportPreset = "weekly" | "monthly" | "annual" | "custom";
export type PeriodPreset = Exclude<ReportPreset, "custom">;

/** Inclusive `YYYY-MM-DD` range. */
export type DateRangeStrings = { startDate: string; endDate: string };

/** The API refuses a series with more buckets than this (400 on `interval`). */
export const MAX_BUCKETS = 400;

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LONG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const pad = (value: number, size = 2) => String(value).padStart(size, "0");

/*
 * Everything below works on whole-day numbers (days since 1970-01-01, via
 * UTC) so daylight-saving shifts or the browser timezone can never move a
 * calendar date. Only "today" comes from the local clock.
 */
function toDayNumber(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

function fromDayNumber(dayNumber: number) {
  const date = new Date(dayNumber * MS_PER_DAY);
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** 1970-01-01 was a Thursday, so a day number's offset from its Monday is (n + 3) mod 7. */
function mondayOf(dayNumber: number) {
  return dayNumber - (((dayNumber + 3) % 7) + 7) % 7;
}

/** True for a real calendar date written `YYYY-MM-DD` (rejects `2026-02-31`, `""`, `26-1-1`). */
export function isValidISODate(value: string) {
  return ISO_DATE.test(value) && fromDayNumber(toDayNumber(value)) === value;
}

/** A local-time `Date` for a `YYYY-MM-DD` string (noon avoids any midnight edge). */
export function isoToLocalDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function todayISO(now: Date = new Date()) {
  return toLocalISODate(now);
}

/** The period containing `anchor` (a `YYYY-MM-DD` day): Monday–Sunday, the calendar month, or the calendar year. */
export function presetRange(preset: PeriodPreset, anchor: string): DateRangeStrings {
  const [year, month] = anchor.split("-").map(Number);
  if (preset === "weekly") {
    const monday = mondayOf(toDayNumber(anchor));
    return { startDate: fromDayNumber(monday), endDate: fromDayNumber(monday + 6) };
  }
  if (preset === "monthly") {
    return {
      startDate: `${pad(year, 4)}-${pad(month)}-01`,
      endDate: fromDayNumber(Math.floor(Date.UTC(year, month, 1) / MS_PER_DAY) - 1),
    };
  }
  return { startDate: `${pad(year, 4)}-01-01`, endDate: `${pad(year, 4)}-12-31` };
}

/** The default filter: the current month. */
export function defaultRange(today: string = todayISO()): DateRangeStrings {
  return presetRange("monthly", today);
}

/** The previous (-1) or next (+1) week / month / year relative to `range`. */
export function shiftPresetRange(preset: PeriodPreset, range: DateRangeStrings, direction: 1 | -1): DateRangeStrings {
  if (preset === "weekly") {
    return presetRange("weekly", fromDayNumber(toDayNumber(range.startDate) + 7 * direction));
  }
  const [year, month] = range.startDate.split("-").map(Number);
  if (preset === "monthly") {
    const target = new Date(Date.UTC(year, month - 1 + direction, 1));
    return presetRange("monthly", fromDayNumber(Math.floor(target.getTime() / MS_PER_DAY)));
  }
  return presetRange("annual", `${pad(year + direction, 4)}-01-01`);
}

/** "12 Oct – 18 Oct 2026", "October 2026", "2026", or the custom span written out. */
export function rangeLabel(preset: ReportPreset, range: DateRangeStrings) {
  if (!isValidISODate(range.startDate) || !isValidISODate(range.endDate)) return "Select dates";
  const [year, month] = range.startDate.split("-").map(Number);
  if (preset === "monthly") return `${LONG_MONTHS[month - 1]} ${year}`;
  if (preset === "annual") return String(year);
  const from = isoToLocalDate(range.startDate);
  const to = isoToLocalDate(range.endDate);
  const sameYear = from.getFullYear() === to.getFullYear();
  const fromLabel = sameYear && preset === "weekly" ? formatEnglishDayMonth(from) : formatEnglishDate(from);
  return `${fromLabel} – ${formatEnglishDate(to)}`;
}

export type FilterErrors = { walletIds?: string; startDate?: string; endDate?: string };

/** Field-level problems that stop a filter from being applied (US8-1). Empty object = valid. */
export function validateReportFilter(filter: { walletIds: string[] } & DateRangeStrings): FilterErrors {
  const errors: FilterErrors = {};
  if (filter.walletIds.length === 0) errors.walletIds = "Select at least 1 wallet";
  const startOk = isValidISODate(filter.startDate);
  const endOk = isValidISODate(filter.endDate);
  if (!startOk) errors.startDate = "Choose a start date";
  if (!endOk) errors.endDate = "Choose an end date";
  if (startOk && endOk && filter.endDate < filter.startDate) {
    errors.endDate = "End date must be on or after the start date";
  }
  return errors;
}

/** Days in the inclusive range. */
export function daysInRange(startDate: string, endDate: string) {
  return toDayNumber(endDate) - toDayNumber(startDate) + 1;
}

/** What the backend picks when no interval is sent: ≤31 days daily, ≤120 weekly, otherwise monthly. */
export function suggestedInterval(days: number): ReportInterval {
  if (days <= 31) return "daily";
  if (days <= 120) return "weekly";
  return "monthly";
}

/** How many buckets the API would return for this range and interval (weeks start Monday; first/last are truncated). */
export function countBuckets(startDate: string, endDate: string, interval: ReportInterval) {
  if (interval === "daily") return daysInRange(startDate, endDate);
  if (interval === "weekly") {
    return (mondayOf(toDayNumber(endDate)) - mondayOf(toDayNumber(startDate))) / 7 + 1;
  }
  const [startYear, startMonth] = startDate.split("-").map(Number);
  const [endYear, endMonth] = endDate.split("-").map(Number);
  return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
}

/** False when the range would exceed `MAX_BUCKETS` at this interval — the toggle disables those options. */
export function isIntervalAllowed(startDate: string, endDate: string, interval: ReportInterval) {
  return countBuckets(startDate, endDate, interval) <= MAX_BUCKETS;
}
