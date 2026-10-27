import { errorMessageOf } from "@/features/reports/components/ReportStates";
import type { RunningBalanceInterval, RunningBalanceResponse } from "@/shared/contracts";
import { daysInRange, isIntervalAllowed, isoToLocalDate } from "@/features/reports/period";
import { ApiClientError } from "@/lib/api/client";
import { formatEnglishDate, formatEnglishDayMonth } from "@/lib/utils";

/*
 * Assumptions the contract does not spell out (A1–A4), each kept in one place
 * here so a single edit follows the backend's answer.
 */

/** A3: ranges longer than this many days start on weekly. */
const WEEKLY_AFTER_DAYS = 90;

/** A4: shown for a 400 on `interval`; running balance has no Monthly, so cash flow's text does not fit. */
export const RUNNING_BALANCE_RANGE_TOO_LARGE = "ช่วงเวลานี้กว้างเกินไป ลองเลือก Weekly";

/** The label of the first chart point (A2). */
export const OPENING_LABEL = "Opening";

export type RunningBalanceChartPoint = {
  /** `YYYY-MM-DD`, or {@link OPENING_LABEL} for the starting point. */
  label: string;
  balance: number;
  isOpening: boolean;
};

/**
 * A3: weekly for ranges over 90 days, otherwise daily. When the preferred one
 * would exceed the point limit but the other would not, use the other. When both
 * exceed it, keep the preferred one and let the server's 400 explain.
 */
export function defaultRunningBalanceInterval(startDate: string, endDate: string): RunningBalanceInterval {
  const preferred: RunningBalanceInterval = daysInRange(startDate, endDate) > WEEKLY_AFTER_DAYS ? "weekly" : "daily";
  const other: RunningBalanceInterval = preferred === "daily" ? "weekly" : "daily";
  if (!isIntervalAllowed(startDate, endDate, preferred) && isIntervalAllowed(startDate, endDate, other)) return other;
  return preferred;
}

/**
 * A2: the API's points are end-of-day balances, so the line starts from an
 * extra "Opening" point carrying `openingBalance`. Values are placed as sent.
 */
export function toRunningBalanceChartData(data: RunningBalanceResponse): RunningBalanceChartPoint[] {
  return [
    { label: OPENING_LABEL, balance: data.openingBalance, isOpening: true },
    ...data.points.map(({ date, balance }) => ({ label: date, balance, isOpening: false })),
  ];
}

/** A1: a weekly point is the balance at the end of its bucket, so its date is the bucket's last day. */
export function pointLabel(date: string, interval: RunningBalanceInterval) {
  const formatted = formatEnglishDate(isoToLocalDate(date));
  return interval === "weekly" ? `Balance as of ${formatted}` : formatted;
}

/** X axis tick text: "18 Oct", or "Opening" for the first point. */
export function tickLabel(label: string) {
  return label === OPENING_LABEL ? OPENING_LABEL : formatEnglishDayMonth(isoToLocalDate(label));
}

/** Y axis range around the data and the opening balance, including 0 when the balance goes negative. */
export function balanceDomain(data: RunningBalanceResponse): [number, number] {
  const values = [data.openingBalance, ...data.points.map((point) => point.balance)];
  const low = Math.min(...values);
  let high = Math.max(...values);
  if (low < 0) high = Math.max(high, 0);
  const pad = (high - low) * 0.1 || Math.abs(high) * 0.1 || 1;
  return [low - pad, high + pad];
}

export function hasNegativeBalance(data: RunningBalanceResponse) {
  return data.openingBalance < 0 || data.points.some((point) => point.balance < 0);
}

/** A4: the server rejects too many points with a field error on `interval`. */
export function runningBalanceErrorMessage(error: unknown) {
  return error instanceof ApiClientError && error.fields?.interval ? RUNNING_BALANCE_RANGE_TOO_LARGE : errorMessageOf(error);
}
