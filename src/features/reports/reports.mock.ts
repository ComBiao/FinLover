import { ApiClientError } from "@/lib/api/client";
import { MAX_BUCKETS, countBuckets, daysInRange, suggestedInterval, todayISO } from "@/features/reports/period";
import type {
  CashFlowBucket,
  CashFlowResponse,
  ReportFilter,
  ReportInterval,
  ReportSummary,
} from "@/features/reports/types";

/*
 * DEV ONLY (NEXT_PUBLIC_REPORTS_MOCK=1): deterministic fake report data so the
 * UI can be built before the backend exists. Delete this file, and the two
 * `USE_MOCK` lines in reportsService.ts, before opening the PR.
 *
 * Handy for checking states: a range entirely in the future returns no data
 * (empty state); a very long daily range triggers the "too many buckets" error.
 */
const MS_PER_DAY = 86_400_000;
const LATENCY_MS = 250;

const dayNumber = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
};
const isoOf = (days: number) => new Date(days * MS_PER_DAY).toISOString().slice(0, 10);
const mondayOf = (days: number) => days - (((days + 3) % 7) + 7) % 7;

function hash(text: string) {
  let value = 0;
  for (let index = 0; index < text.length; index += 1) value = (value * 31 + text.charCodeAt(index)) >>> 0;
  return value;
}

function dailyAmounts(filter: ReportFilter, iso: string) {
  if (iso > todayISO()) return { income: 0, expense: 0, count: 0 };
  const seed = hash(`${[...filter.walletIds].sort().join(",")}|${iso}`);
  const income = seed % 11 === 0 ? 3000 + (seed % 7) * 500 : 0;
  const expense = seed % 3 === 0 ? 50 + (seed % 40) * 10 : 0;
  return { income, expense, count: (income > 0 ? 1 : 0) + (expense > 0 ? 1 : 0) };
}

function bucketKey(days: number, interval: ReportInterval) {
  if (interval === "daily") return isoOf(days);
  if (interval === "weekly") return isoOf(mondayOf(days));
  return isoOf(days).slice(0, 7);
}

function buildBuckets(filter: ReportFilter, interval: ReportInterval): CashFlowBucket[] {
  const buckets = new Map<string, CashFlowBucket>();
  const first = dayNumber(filter.startDate);
  const last = dayNumber(filter.endDate);
  for (let days = first; days <= last; days += 1) {
    const key = bucketKey(days, interval);
    const iso = isoOf(days);
    const { income, expense } = dailyAmounts(filter, iso);
    const bucket = buckets.get(key) ?? { label: key, start: iso, end: iso, income: 0, expense: 0 };
    bucket.end = iso;
    bucket.income += income;
    bucket.expense += expense;
    buckets.set(key, bucket);
  }
  return [...buckets.values()];
}

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, LATENCY_MS));

export async function mockSummary(filter: ReportFilter): Promise<ReportSummary> {
  await wait();
  let totalIncome = 0;
  let totalExpense = 0;
  let transactionCount = 0;
  for (let days = dayNumber(filter.startDate); days <= dayNumber(filter.endDate); days += 1) {
    const { income, expense, count } = dailyAmounts(filter, isoOf(days));
    totalIncome += income;
    totalExpense += expense;
    transactionCount += count;
  }
  return { totalIncome, totalExpense, netCashFlow: totalIncome - totalExpense, transactionCount };
}

export async function mockCashFlow(filter: ReportFilter, interval?: ReportInterval): Promise<CashFlowResponse> {
  await wait();
  const suggested = suggestedInterval(daysInRange(filter.startDate, filter.endDate));
  const chosen = interval ?? suggested;
  if (countBuckets(filter.startDate, filter.endDate, chosen) > MAX_BUCKETS) {
    throw new ApiClientError("One or more fields are invalid", 400, {
      interval: `This range would produce more than ${MAX_BUCKETS} buckets`,
    });
  }
  return { interval: chosen, suggestedInterval: suggested, buckets: buildBuckets(filter, chosen) };
}
