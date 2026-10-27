import { describe, expect, it } from "vitest";

import { bucketTitle, isCashFlowEmpty, tickLabel } from "@/features/reports/cashFlowFormat";
import type { CashFlowBucket } from "@/features/reports/types";

const bucket = (overrides: Partial<CashFlowBucket> = {}): CashFlowBucket => ({
  label: "2026-09-05",
  start: "2026-09-05",
  end: "2026-09-05",
  income: 0,
  expense: 0,
  ...overrides,
});

describe("tickLabel", () => {
  it("shows day and month for daily and weekly buckets, month and year for monthly", () => {
    expect(tickLabel("2026-09-05", "daily")).toBe("5 Sep");
    expect(tickLabel("2026-09-07", "weekly")).toBe("7 Sep");
    expect(tickLabel("2026-09", "monthly")).toBe("Sep 2026");
    expect(tickLabel("2026-12", "monthly")).toBe("Dec 2026");
  });
});

describe("bucketTitle", () => {
  it("names the bucket for the tooltip", () => {
    expect(bucketTitle(bucket(), "daily")).toBe("5 Sep 2026");
    expect(bucketTitle(bucket({ start: "2026-09-07", end: "2026-09-13" }), "weekly")).toBe("7 Sep – 13 Sep 2026");
    expect(bucketTitle(bucket({ label: "2026-09", start: "2026-09-01", end: "2026-09-30" }), "monthly")).toBe(
      "September 2026"
    );
  });
});

describe("isCashFlowEmpty", () => {
  it("is empty when there are no buckets or every bucket is zero", () => {
    expect(isCashFlowEmpty([])).toBe(true);
    expect(isCashFlowEmpty([bucket(), bucket({ label: "2026-09-06" })])).toBe(true);
  });

  it("is not empty when any bucket has income or expense, even if the other side is zero", () => {
    expect(isCashFlowEmpty([bucket(), bucket({ expense: 120 })])).toBe(false);
    expect(isCashFlowEmpty([bucket({ income: 500 })])).toBe(false);
  });
});
