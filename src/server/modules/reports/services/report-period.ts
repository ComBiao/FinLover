import type { ReportInterval } from '@/shared/contracts';
import { AppError } from '@/server/shared/kernel/AppError';
import { toCents } from './report-math';

/** Most buckets (or running-balance points) one report request may produce. */
export const MAX_BUCKETS = 400;
const DAY_MS = 86_400_000;

export type Bucket = { label: string; start: string; end: string };

/** UTC midnight of a YYYY-MM-DD date, the form transaction dates are stored in. */
export function utcDate(value: string, addDays = 0) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + addDays);
  return date;
}

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/** Inclusive number of calendar days from start to end. */
export const dayCount = (start: string, end: string) => Math.round((utcDate(end).getTime() - utcDate(start).getTime()) / DAY_MS) + 1;

/** Monday on or before the date. */
function weekStart(value: string) {
  const date = utcDate(value);
  return utcDate(value, -((date.getUTCDay() + 6) % 7));
}

/** Contract v1.1: up to 31 days daily, up to 120 days weekly, longer ranges monthly. */
export function suggestedInterval(start: string, end: string): ReportInterval {
  const days = dayCount(start, end);
  return days <= 31 ? 'daily' : days <= 120 ? 'weekly' : 'monthly';
}

/** Bucket count without building them, so oversized ranges are rejected cheaply. */
export function bucketCount(start: string, end: string, interval: ReportInterval) {
  if (interval === 'daily') return dayCount(start, end);
  if (interval === 'weekly') return Math.round((weekStart(end).getTime() - weekStart(start).getTime()) / (7 * DAY_MS)) + 1;
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
}

/** Rejects ranges that would exceed MAX_BUCKETS for the interval; the client then suggests a coarser one. */
export function assertBucketLimit(start: string, end: string, interval: ReportInterval) {
  if (bucketCount(start, end, interval) > MAX_BUCKETS) {
    throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { interval: `The range has more than ${MAX_BUCKETS} ${interval} buckets; choose a longer interval or a shorter range` });
  }
}

/**
 * Every bucket from start to end inclusive, empty ones included. Weeks start on Monday and
 * months on the 1st; the first and last buckets are clipped to the range.
 */
export function buildBuckets(start: string, end: string, interval: ReportInterval): Bucket[] {
  const buckets: Bucket[] = [];
  let cursor = utcDate(start);
  const last = utcDate(end);
  while (cursor <= last) {
    const bucketStart = isoDate(cursor);
    let next: Date;
    if (interval === 'daily') next = utcDate(bucketStart, 1);
    else if (interval === 'weekly') next = utcDate(isoDate(weekStart(bucketStart)), 7);
    else next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const bucketEnd = next > last ? end : isoDate(utcDate(isoDate(next), -1));
    buckets.push({ label: interval === 'monthly' ? bucketStart.slice(0, 7) : bucketStart, start: bucketStart, end: bucketEnd });
    cursor = next;
  }
  return buckets;
}

/** Rolls per-day totals (sorted, inside the range) into the buckets, as whole cents. */
export function totalsPerBucket(buckets: Bucket[], days: { date: string; income: number; expense: number }[]) {
  const totals = buckets.map(bucket => ({ ...bucket, income: 0, expense: 0 }));
  let index = 0;
  for (const day of days) {
    while (index < totals.length - 1 && day.date > totals[index].end) index += 1;
    totals[index].income += toCents(day.income);
    totals[index].expense += toCents(day.expense);
  }
  return totals;
}
