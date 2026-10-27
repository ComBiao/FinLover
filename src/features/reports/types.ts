import type { ReportSummaryResponse } from "@/shared/contracts";

/** Report response shapes come from the shared API contract (`/api/v1/reports/*`, Epic 8). */
export type { CashFlowBucket, CashFlowResponse, ReportInterval } from "@/shared/contracts";

/** What every report section is queried with. Dates are `YYYY-MM-DD`, both ends inclusive. */
export type ReportFilter = {
  walletIds: string[];
  startDate: string;
  endDate: string;
};

/** `GET /reports/summary` */
export type ReportSummary = ReportSummaryResponse;
