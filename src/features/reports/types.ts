/**
 * Report data shapes — API contract v1.1 (`/api/v1/reports/*`, Epic 8).
 * Kept local until the backend contract lands in `@/shared/contracts`; after
 * rebasing onto it, import the shared types instead and delete these.
 */
export type ReportInterval = "daily" | "weekly" | "monthly";

/** What every report section is queried with. Dates are `YYYY-MM-DD`, both ends inclusive. */
export type ReportFilter = {
  walletIds: string[];
  startDate: string;
  endDate: string;
};

/** `GET /reports/summary` */
export type ReportSummary = {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  transactionCount: number;
};

export type CashFlowBucket = {
  label: string;
  start: string;
  end: string;
  income: number;
  expense: number;
};

/** `GET /reports/cash-flow` */
export type CashFlowResponse = {
  interval: ReportInterval;
  suggestedInterval: ReportInterval;
  buckets: CashFlowBucket[];
};
