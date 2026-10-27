import { isoToLocalDate, rangeLabel } from "@/features/reports/period";
import type { CashFlowBucket, ReportInterval } from "@/features/reports/types";
import { formatEnglishDate, formatEnglishDayMonth } from "@/lib/utils";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** X-axis tick: `5 Sep` for a day or the first day of a week, `Sep 2026` for a month. */
export function tickLabel(label: string, interval: ReportInterval) {
  if (interval === "monthly") {
    const [year, month] = label.split("-").map(Number);
    return `${SHORT_MONTHS[month - 1]} ${year}`;
  }
  return formatEnglishDayMonth(isoToLocalDate(label));
}

/** Tooltip heading for a bucket: a date, a week span, or a month name. */
export function bucketTitle(bucket: CashFlowBucket, interval: ReportInterval) {
  if (interval === "daily") return formatEnglishDate(isoToLocalDate(bucket.start));
  if (interval === "weekly") {
    return `${formatEnglishDayMonth(isoToLocalDate(bucket.start))} – ${formatEnglishDate(isoToLocalDate(bucket.end))}`;
  }
  return rangeLabel("monthly", { startDate: bucket.start, endDate: bucket.end });
}

/** True when there is nothing to draw: no buckets, or every bucket is 0 / 0. */
export function isCashFlowEmpty(buckets: CashFlowBucket[]) {
  return buckets.every((bucket) => bucket.income === 0 && bucket.expense === 0);
}

export const RANGE_TOO_LARGE_MESSAGE = "ช่วงเวลานี้กว้างเกินไปสำหรับ interval นี้ ลองเลือก Weekly/Monthly";
