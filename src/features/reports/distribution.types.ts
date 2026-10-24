/**
 * Category distribution and running balance shapes — API contract v1.1
 * (`/api/v1/reports/category-distribution`, `/api/v1/reports/running-balance`).
 * Kept local until the backend contract lands in `@/shared/contracts`; after
 * rebasing onto it, import the shared types instead and delete this file.
 */

/** `categoryId` is null for the synthetic "Other (No Category)" row. */
export type DistributionItem = {
  categoryId: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  amount: number;
  percentage: number;
};

export type DistributionSide = { total: number; items: DistributionItem[] };

/** `GET /reports/category-distribution` */
export type CategoryDistribution = { income: DistributionSide; expense: DistributionSide };

export type RunningBalanceInterval = "daily" | "weekly";

export type RunningBalancePoint = { date: string; balance: number };

/** `GET /reports/running-balance` */
export type RunningBalance = {
  interval: RunningBalanceInterval;
  openingBalance: number;
  closingBalance: number;
  points: RunningBalancePoint[];
};
