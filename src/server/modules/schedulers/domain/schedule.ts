import type { SchedulerFrequency } from '@/shared/contracts/schedulers';

// Calendar dates are UTC-midnight Dates, like Transaction.date.
const DAY_MS = 86_400_000;
const BANGKOK_OFFSET_MS = 7 * 3_600_000;

export interface Cadence { anchorDay: number; frequency: SchedulerFrequency; interval: number }
export interface EndRule { type: 'never' | 'count' | 'endDate'; count?: number; endDate?: Date }

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);
// Clamp to the month's last day; the anchor day is never overwritten, so March returns to the 31st.
const monthDate = (year: number, month: number, anchorDay: number) => {
  const total = year * 12 + month;
  const y = Math.floor(total / 12), m = total % 12;
  return new Date(Date.UTC(y, m, Math.min(anchorDay, daysInMonth(y, m))));
};

/** Today's calendar date in Asia/Bangkok (UTC+7, no DST). */
export function todayBangkok(now = new Date()): Date {
  const local = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

/** The due date after `from` (a due date on the cadence). */
export function nextAfter(from: Date, { anchorDay, frequency, interval }: Cadence): Date {
  if (frequency === 'daily') return addDays(from, interval);
  if (frequency === 'weekly') return addDays(from, interval * 7);
  const months = frequency === 'monthly' ? interval : interval * 12;
  return monthDate(from.getUTCFullYear(), from.getUTCMonth() + months, anchorDay);
}

/** The first due date on or after `today`, walking from `start`; never back-fills the past. */
export function firstDue(start: Date, today: Date, cadence: Cadence): Date {
  let due = start;
  // shortcut: linear walk, fine for recent start dates; use arithmetic if start dates may be decades old.
  while (due < today) due = nextAfter(due, cadence);
  return due;
}

/** Turns "5 months" into a fixed inclusive end date, clamped like a monthly due date. */
export function endDateFromSpan(start: Date, value: number, unit: 'weeks' | 'months' | 'years'): Date {
  if (unit === 'weeks') return addDays(start, value * 7);
  return monthDate(start.getUTCFullYear(), start.getUTCMonth() + (unit === 'months' ? value : value * 12), start.getUTCDate());
}

/** Whether `next` (the date after the one just posted) falls outside the end rule. */
export function isFinished(end: EndRule, createdCount: number, next: Date): boolean {
  if (end.type === 'count') return createdCount >= (end.count ?? 0);
  if (end.type === 'endDate') return !!end.endDate && next > end.endDate;
  return false;
}
