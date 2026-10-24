import { ApiClientError } from "@/lib/api/client";
import { MAX_BUCKETS, countBuckets, presetRange, todayISO } from "@/features/reports/period";
import type {
  CategoryDistribution,
  DistributionItem,
  RunningBalance,
  RunningBalanceInterval,
  RunningBalancePoint,
} from "@/features/reports/distribution.types";
import type { ReportFilter } from "@/features/reports/types";

/*
 * DEV ONLY (NEXT_PUBLIC_REPORTS_MOCK=1): deterministic fake data for the
 * category distribution and running balance sections. Delete this file, and the
 * `USE_MOCK` lines in distributionService.ts / runningBalanceService.ts, before
 * opening the PR.
 *
 * Reaching each state from the real filter UI (today is the reference):
 *  - range starting this month ........ full data
 *  - range entirely in a past month ... expense only + "Other (No Category)", and a negative balance
 *  - range entirely in the future ..... both sides empty
 *  - daily range over 400 days ........ running balance "too wide" error
 */
const MS_PER_DAY = 86_400_000;
const LATENCY_MS = 250;
const OPENING_BALANCE = 12_400;

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, LATENCY_MS));

const dayNumber = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
};
const isoOf = (days: number) => new Date(days * MS_PER_DAY).toISOString().slice(0, 10);
const sundayOf = (days: number) => days + 6 - (((days + 3) % 7) + 7) % 7;

type Scenario = "full" | "past" | "future";

function scenarioOf(filter: ReportFilter): Scenario {
  const today = todayISO();
  if (filter.startDate > today) return "future";
  if (filter.endDate < presetRange("monthly", today).startDate) return "past";
  return "full";
}

// Percentages are written out so each side sums to exactly 100.0 (the real server does this rounding).
const FULL: CategoryDistribution = {
  income: {
    total: 50_000,
    items: [
      { categoryId: "inc-salary", name: "Salary", icon: "Wallet", color: "#16A34A", amount: 45_000, percentage: 90.0 },
      { categoryId: "inc-investment", name: "Investment", icon: "PieChart", color: "#2563EB", amount: 5_000, percentage: 10.0 },
    ],
  },
  expense: {
    total: 12_000,
    items: [
      { categoryId: "exp-food", name: "Food & Drinks", icon: "Utensils", color: "#EA580C", amount: 4_500, percentage: 37.5 },
      { categoryId: "exp-shopping", name: "Shopping", icon: "ShoppingCart", color: "#DB2777", amount: 3_000, percentage: 25.0 },
      { categoryId: "exp-transport", name: "Transportation", icon: "Car", color: "#2563EB", amount: 2_400, percentage: 20.0 },
      { categoryId: "exp-others", name: "Others", icon: "MoreHorizontal", color: "#4B5563", amount: 2_100, percentage: 17.5 },
    ],
  },
};

const NO_CATEGORY: DistributionItem = {
  categoryId: null,
  name: "Other (No Category)",
  icon: null,
  color: null,
  amount: 1_000,
  percentage: 12.5,
};

const PAST: CategoryDistribution = {
  income: { total: 0, items: [] },
  expense: {
    total: 8_000,
    items: [
      { categoryId: "exp-food", name: "Food & Drinks", icon: "Utensils", color: "#EA580C", amount: 3_200, percentage: 40.0 },
      { categoryId: "exp-transport", name: "Transportation", icon: "Car", color: "#2563EB", amount: 2_000, percentage: 25.0 },
      { categoryId: "exp-shopping", name: "Shopping", icon: "ShoppingCart", color: "#DB2777", amount: 1_800, percentage: 22.5 },
      NO_CATEGORY,
    ],
  },
};

const EMPTY: CategoryDistribution = { income: { total: 0, items: [] }, expense: { total: 0, items: [] } };

export async function mockCategoryDistribution(filter: ReportFilter): Promise<CategoryDistribution> {
  await wait();
  const scenario = scenarioOf(filter);
  return structuredClone(scenario === "full" ? FULL : scenario === "past" ? PAST : EMPTY);
}

function hash(text: string) {
  let value = 0;
  for (let index = 0; index < text.length; index += 1) value = (value * 31 + text.charCodeAt(index)) >>> 0;
  return value;
}

/** Net change of one day: many days have nothing (flat line); nothing happens after today. */
function dailyNet(filter: ReportFilter, iso: string, scenario: Scenario) {
  if (iso > todayISO()) return 0;
  // The past scenario has one big expense early on so the balance goes below zero.
  if (scenario === "past" && iso === isoOf(dayNumber(filter.startDate) + 3)) return -30_000;
  const seed = hash(`${[...filter.walletIds].sort().join(",")}|${iso}`);
  const income = seed % 11 === 0 ? 3000 + (seed % 7) * 500 : 0;
  const expense = seed % 3 === 0 ? 50 + (seed % 40) * 10 : 0;
  return income - expense;
}

export async function mockRunningBalance(
  filter: ReportFilter,
  interval: RunningBalanceInterval
): Promise<RunningBalance> {
  await wait();
  if (countBuckets(filter.startDate, filter.endDate, interval) > MAX_BUCKETS) {
    throw new ApiClientError("One or more fields are invalid", 400, {
      interval: `This range would produce more than ${MAX_BUCKETS} points`,
    });
  }

  const scenario = scenarioOf(filter);
  const first = dayNumber(filter.startDate);
  const last = dayNumber(filter.endDate);
  const points: RunningBalancePoint[] = [];
  let balance = OPENING_BALANCE;
  for (let days = first; days <= last; days += 1) {
    balance = Math.round((balance + dailyNet(filter, isoOf(days), scenario)) * 100) / 100;
    // Daily: every day. Weekly: the Sunday closing the bucket, or the end date for the last (truncated) one.
    if (interval === "daily" || days === last || days === sundayOf(days)) {
      points.push({ date: isoOf(days), balance });
    }
  }
  return { interval, openingBalance: OPENING_BALANCE, closingBalance: balance, points };
}
