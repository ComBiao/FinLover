import { todayISODate } from "@/lib/utils";

/** A calendar month as "YYYY-MM", matching the `month` query param shape `GET /api/home/summary` will use. */
export type MonthKey = string;

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function currentMonthKey(): MonthKey {
  return todayISODate().slice(0, 7);
}

export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  const [year, month] = key.split("-").map(Number);
  return { year, month };
}

export function formatMonthKey(year: number, month: number): MonthKey {
  const normalizedTotal = year * 12 + (month - 1);
  const normalizedYear = Math.floor(normalizedTotal / 12);
  const normalizedMonth = (normalizedTotal % 12) + 1;
  return `${normalizedYear}-${String(normalizedMonth).padStart(2, "0")}`;
}

/** Adds (or subtracts, with a negative `delta`) whole months to a month key, rolling over year boundaries with no limit on how far past/future it can go. */
export function shiftMonthKey(key: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonthKey(key);
  return formatMonthKey(year, month + delta);
}

export function monthKeyLabel(key: MonthKey): string {
  const { year, month } = parseMonthKey(key);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function isDateInMonth(date: Date, key: MonthKey): boolean {
  const { year, month } = parseMonthKey(key);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}
