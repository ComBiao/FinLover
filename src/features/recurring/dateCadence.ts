import { toLocalISODate } from "@/lib/utils";
import type { IntervalUnit, RecurringRule } from "./types";

/**
 * Parses YYYY-MM-DD into [year, month (1-12), day (1-31)].
 */
export function parseISODateParts(isoDate: string): [number, number, number] {
  const parts = isoDate.split("-").map(Number);
  return [parts[0], parts[1], parts[2]];
}

/**
 * Returns the number of days in the given year and month (1-based month: 1=Jan, 12=Dec).
 */
export function getDaysInMonth(year: number, month1Based: number): number {
  return new Date(year, month1Based, 0).getDate();
}

/**
 * Given a target day of week index (0=Sun, 1=Mon, ..., 6=Sat) and a reference date,
 * finds the date on that weekday closest to referenceDateStr, ensuring the result is >= minDateStr.
 */
export function getWeekdayClosestToDate(
  targetDayIndex: number,
  referenceDateStr: string,
  minDateStr: string
): string {
  const [ry, rm, rd] = parseISODateParts(referenceDateStr);
  const refDate = new Date(ry, rm - 1, rd);
  const currentDay = refDate.getDay();

  let diff = targetDayIndex - currentDay;
  if (diff > 3) {
    diff -= 7;
  } else if (diff < -3) {
    diff += 7;
  }

  const resultDate = new Date(ry, rm - 1, rd);
  resultDate.setDate(resultDate.getDate() + diff);

  const [my, mm, md] = parseISODateParts(minDateStr);
  const minDate = new Date(my, mm - 1, md);

  while (resultDate < minDate) {
    resultDate.setDate(resultDate.getDate() + 7);
  }

  const y = resultDate.getFullYear();
  const m = String(resultDate.getMonth() + 1).padStart(2, "0");
  const d = String(resultDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Computes the exact date of the k-th occurrence (0-based, where 0 is startDate).
 * Implements strict calendar clamping for month-end dates (e.g. Jan 31 -> Feb 28/29 -> Mar 31).
 */
export function computeOccurrenceDate(
  startDateStr: string,
  anchorDay: number,
  intervalN: number,
  intervalUnit: IntervalUnit,
  occurrenceIndex: number
): string {
  const [startYear, startMonth, startDay] = parseISODateParts(startDateStr);
  const effectiveAnchor = anchorDay || startDay;

  if (occurrenceIndex <= 0) {
    return startDateStr;
  }

  if (intervalUnit === "days") {
    const d = new Date(startYear, startMonth - 1, startDay);
    d.setDate(d.getDate() + occurrenceIndex * intervalN);
    return toLocalISODate(d);
  }

  if (intervalUnit === "weeks") {
    const d = new Date(startYear, startMonth - 1, startDay);
    d.setDate(d.getDate() + occurrenceIndex * intervalN * 7);
    return toLocalISODate(d);
  }

  if (intervalUnit === "months") {
    const totalMonths = (startMonth - 1) + occurrenceIndex * intervalN;
    const targetYear = startYear + Math.floor(totalMonths / 12);
    const targetMonth0Based = ((totalMonths % 12) + 12) % 12;
    const maxDays = new Date(targetYear, targetMonth0Based + 1, 0).getDate();
    const clampedDay = Math.min(effectiveAnchor, maxDays);
    const d = new Date(targetYear, targetMonth0Based, clampedDay);
    return toLocalISODate(d);
  }

  if (intervalUnit === "years") {
    const targetYear = startYear + occurrenceIndex * intervalN;
    const targetMonth0Based = startMonth - 1;
    const maxDays = new Date(targetYear, targetMonth0Based + 1, 0).getDate();
    const clampedDay = Math.min(effectiveAnchor, maxDays);
    const d = new Date(targetYear, targetMonth0Based, clampedDay);
    return toLocalISODate(d);
  }

  return startDateStr;
}

/**
 * Given a rule and reference date, calculates the next run date.
 */
export function getNextRunDateAfter(
  rule: Pick<RecurringRule, "startDate" | "anchorDay" | "intervalN" | "intervalUnit">,
  afterDateISO: string
): string {
  const anchor = rule.anchorDay ?? parseISODateParts(rule.startDate)[2];
  let k = 1;
  while (k < 1000) {
    const candidate = computeOccurrenceDate(rule.startDate, anchor, rule.intervalN, rule.intervalUnit, k);
    if (candidate > afterDateISO) {
      return candidate;
    }
    k++;
  }
  return afterDateISO;
}

/**
 * For US4-4: Resuming an overdue rule advances to the next upcoming cycle >= referenceDate
 * without retroactive double-posting.
 */
export function getResumeNextRunDate(
  rule: Pick<RecurringRule, "startDate" | "anchorDay" | "intervalN" | "intervalUnit" | "nextRunDate">,
  referenceDateISO: string
): { nextRunDate: string; skippedCycles: number } {
  // If nextRunDate is already in the future, keep it
  if (rule.nextRunDate >= referenceDateISO) {
    return { nextRunDate: rule.nextRunDate, skippedCycles: 0 };
  }

  const anchor = rule.anchorDay ?? parseISODateParts(rule.startDate)[2];
  let k = 0;
  let skipped = 0;

  while (k < 2000) {
    const candidate = computeOccurrenceDate(rule.startDate, anchor, rule.intervalN, rule.intervalUnit, k);
    if (candidate >= referenceDateISO) {
      return { nextRunDate: candidate, skippedCycles: skipped };
    }
    if (candidate > rule.nextRunDate) {
      skipped++;
    }
    k++;
  }

  return { nextRunDate: referenceDateISO, skippedCycles: skipped };
}

/**
 * Returns all due occurrence dates between rule's nextRunDate and targetDateISO (inclusive).
 * Respects end condition cutoff.
 */
export function getDueOccurrences(
  rule: RecurringRule,
  targetDateISO: string
): { date: string; occurrenceNumber: number }[] {
  if (rule.status !== "active") return [];

  const results: { date: string; occurrenceNumber: number }[] = [];
  const anchor = rule.anchorDay ?? parseISODateParts(rule.startDate)[2];
  
  let currentCount = rule.postedCount;
  let nextDate = rule.nextRunDate;

  while (nextDate <= targetDateISO) {
    // Check end condition: max count
    if (rule.endType === "count" && rule.totalOccurrences && currentCount >= rule.totalOccurrences) {
      break;
    }
    // Check end condition: end date
    if (rule.endType === "date" && rule.endDate && nextDate > rule.endDate) {
      break;
    }

    currentCount++;
    results.push({
      date: nextDate,
      occurrenceNumber: currentCount,
    });

    // Check if limit reached after this occurrence
    if (rule.endType === "count" && rule.totalOccurrences && currentCount >= rule.totalOccurrences) {
      break;
    }

    // Compute next occurrence date
    nextDate = computeOccurrenceDate(
      rule.startDate,
      anchor,
      rule.intervalN,
      rule.intervalUnit,
      currentCount
    );

    if (rule.endType === "date" && rule.endDate && nextDate > rule.endDate) {
      break;
    }
  }

  return results;
}

export const WEEKDAY_FULL_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const WEEKDAY_SHORT_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

export const SHORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Formats an ISO date string (YYYY-MM-DD) into `dd Mon YYYY` format.
 * Example: "2026-10-23" -> "23 Oct 2026"
 */
export function formatShortDateWithAbbrMonth(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("T")[0].split("-").map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d) return dateStr;
  const monthAbbr = SHORT_MONTH_NAMES[m - 1] ?? "";
  const dayStr = String(d).padStart(2, "0");
  return `${dayStr} ${monthAbbr} ${y}`;
}

/**
 * Returns a human-friendly cadence string.
 * Examples:
 * - "Every Day", "Every 3 Days"
 * - "Every Week (Fri)", "Every 2 Weeks (Sat)"
 * - "Monthly on day 23", "Every 3 Months (day 5)"
 * - "Every Year"
 */
export function formatCadenceString(rule: Pick<RecurringRule, "intervalN" | "intervalUnit" | "startDate" | "anchorDay">): string {
  const { intervalN, intervalUnit, startDate, anchorDay } = rule;
  const [, , day] = parseISODateParts(startDate);
  const effectiveDay = anchorDay ?? day;

  if (intervalUnit === "days") {
    return intervalN === 1 ? "Every Day" : `Every ${intervalN} Days`;
  }

  if (intervalUnit === "weeks") {
    const [y, m, d] = parseISODateParts(startDate);
    const weekday = WEEKDAY_SHORT_NAMES[new Date(y, m - 1, d).getDay()];
    return intervalN === 1
      ? `Every Week (${weekday})`
      : `Every ${intervalN} Weeks (${weekday})`;
  }

  if (intervalUnit === "months") {
    if (intervalN === 1) {
      return `Monthly on day ${effectiveDay}`;
    }
    return `Every ${intervalN} Months (day ${effectiveDay})`;
  }

  if (intervalUnit === "years") {
    return intervalN === 1 ? "Every Year" : `Every ${intervalN} Years`;
  }

  return `Every ${intervalN} ${intervalUnit}`;
}

/**
 * Returns ordinal suffix for a number (1st, 2nd, 3rd, 4th...).
 */
export function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Returns end condition summary string according to US4-3:
 * e.g. "Indefinite", "4 occurrences remaining", "Ends on 2026-12-31"
 */
export function formatEndConditionSummary(
  rule: Pick<RecurringRule, "endType"> &
    Partial<Pick<RecurringRule, "totalOccurrences" | "postedCount" | "endDate">>
): string {
  if (rule.endType === "never") {
    return "Indefinite";
  }

  if (rule.endType === "count" && rule.totalOccurrences != null) {
    const posted = rule.postedCount ?? 0;
    const remaining = Math.max(0, rule.totalOccurrences - posted);
    if (remaining === 0) {
      return `Completed,\n(${rule.totalOccurrences} of ${rule.totalOccurrences} posted)`;
    }
    return `Ongoing,\n(${posted} of ${rule.totalOccurrences} posted)`;
  }

  if (rule.endType === "date" && rule.endDate) {
    return `Ends on ${rule.endDate}`;
  }

  return "Indefinite";
}


