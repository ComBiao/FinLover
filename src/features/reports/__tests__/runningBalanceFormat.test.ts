import { describe, expect, it } from "vitest";

import type { RunningBalanceResponse } from "@/shared/contracts";
import {
  RUNNING_BALANCE_RANGE_TOO_LARGE,
  balanceDomain,
  defaultRunningBalanceInterval,
  pointLabel,
  runningBalanceErrorMessage,
  tickLabel,
  toRunningBalanceChartData,
} from "@/features/reports/runningBalanceFormat";
import { ApiClientError } from "@/lib/api/client";

describe("defaultRunningBalanceInterval (A3)", () => {
  it("is daily up to 90 days and weekly from 91", () => {
    expect(defaultRunningBalanceInterval("2026-01-01", "2026-03-31")).toBe("daily"); // 90 days
    expect(defaultRunningBalanceInterval("2026-01-01", "2026-04-01")).toBe("weekly"); // 91 days
  });

  it("is weekly when daily would exceed 400 points", () => {
    expect(defaultRunningBalanceInterval("2025-01-01", "2026-12-31")).toBe("weekly"); // 730 days
  });

  it("stays weekly when both exceed the limit, so the server can answer 400", () => {
    expect(defaultRunningBalanceInterval("2000-01-01", "2026-12-31")).toBe("weekly");
  });
});

const data: RunningBalanceResponse = {
  interval: "daily",
  openingBalance: 12_400,
  closingBalance: 12_100,
  points: [
    { date: "2026-10-01", balance: 12_500 },
    { date: "2026-10-02", balance: 12_500 },
    { date: "2026-10-03", balance: 12_100 },
  ],
};

describe("toRunningBalanceChartData (A2)", () => {
  it("starts at the opening balance and keeps the API's points as sent", () => {
    const chart = toRunningBalanceChartData(data);
    expect(chart[0]).toEqual({ label: "Opening", balance: 12_400, isOpening: true });
    expect(chart.slice(1).map(({ label, balance }) => [label, balance])).toEqual(
      data.points.map(({ date, balance }) => [date, balance])
    );
    expect(chart).toHaveLength(data.points.length + 1);
  });
});

describe("labels", () => {
  it("writes weekly points as the balance at the bucket's last day (A1)", () => {
    expect(pointLabel("2026-10-18", "weekly")).toBe("Balance as of 18 Oct 2026");
    expect(pointLabel("2026-10-18", "daily")).toBe("18 Oct 2026");
  });

  it("shortens axis ticks", () => {
    expect(tickLabel("2026-10-18")).toBe("18 Oct");
    expect(tickLabel("Opening")).toBe("Opening");
  });
});

describe("balanceDomain", () => {
  it("covers the data and the opening balance without forcing 0", () => {
    const [low, high] = balanceDomain(data);
    expect(low).toBeGreaterThan(0);
    expect(low).toBeLessThan(12_100);
    expect(high).toBeGreaterThan(12_500);
  });

  it("includes 0 once the balance goes negative", () => {
    const [low, high] = balanceDomain({ ...data, points: [{ date: "2026-10-01", balance: -500 }] });
    expect(low).toBeLessThan(-500);
    expect(high).toBeGreaterThan(12_400);
  });

  it("handles a flat line", () => {
    const [low, high] = balanceDomain({ ...data, points: [{ date: "2026-10-01", balance: 12_400 }] });
    expect(low).toBeLessThan(12_400);
    expect(high).toBeGreaterThan(12_400);
  });
});

describe("runningBalanceErrorMessage (A4)", () => {
  it("explains a 400 on interval", () => {
    const error = new ApiClientError("One or more fields are invalid", 400, { interval: "too many" });
    expect(runningBalanceErrorMessage(error)).toBe(RUNNING_BALANCE_RANGE_TOO_LARGE);
  });

  it("shows the server's message otherwise", () => {
    expect(runningBalanceErrorMessage(new ApiClientError("Wallet not found", 404))).toBe("Wallet not found");
  });
});
