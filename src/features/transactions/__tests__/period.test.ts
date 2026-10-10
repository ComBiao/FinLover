import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTransactionFilters } from "@/features/transactions/store/useTransactionFilters";

const store = () => useTransactionFilters.getState();

function ymd(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
}

describe("transaction period anchor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 12));
    store().resetFilters();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Month (Sep 2025) → Year → Month returns to Sep 2025", () => {
    store().setPeriod({ mode: "month", monthKey: "2025-09" });
    store().setMode("year");
    expect(store().period).toEqual({ mode: "year", year: 2025 });
    store().setMode("month");
    expect(store().period).toEqual({ mode: "month", monthKey: "2025-09" });
  });

  it("Day (Sep 15) → Month → Day returns to Sep 15", () => {
    store().setPeriod({ mode: "day", from: new Date(2025, 8, 15), to: new Date(2025, 8, 15) });
    store().setMode("month");
    expect(store().period).toEqual({ mode: "month", monthKey: "2025-09" });
    store().setMode("day");
    const period = store().period;
    expect(period.mode).toBe("day");
    if (period.mode === "day") {
      expect(ymd(period.from)).toEqual([2025, 9, 15]);
      expect(ymd(period.to)).toEqual([2025, 9, 15]);
    }
  });

  it("Year ‹ › keeps the month", () => {
    store().setPeriod({ mode: "month", monthKey: "2025-03" });
    store().setMode("year");
    store().setPeriod({ mode: "year", year: 2026 });
    store().setPeriod({ mode: "year", year: 2027 });
    store().setMode("month");
    expect(store().period).toEqual({ mode: "month", monthKey: "2027-03" });
  });

  it("clamps the day to the target month's length", () => {
    store().setPeriod({ mode: "day", from: new Date(2026, 0, 31), to: new Date(2026, 0, 31) });
    store().setPeriod({ mode: "month", monthKey: "2026-02" });
    expect(ymd(store().anchor)).toEqual([2026, 2, 28]);
  });

  it("a day range anchors on its end date", () => {
    store().setPeriod({ mode: "day", from: new Date(2025, 8, 10), to: new Date(2025, 8, 15) });
    expect(ymd(store().anchor)).toEqual([2025, 9, 15]);
  });

  it("Reset Filters resets the anchor to today", () => {
    store().setPeriod({ mode: "month", monthKey: "2024-01" });
    store().resetFilters();
    expect(ymd(store().anchor)).toEqual([2026, 10, 20]);
    expect(store().period).toEqual({ mode: "month", monthKey: "2026-10" });
  });

  it("keeps filters.dateRange in sync when switching mode", () => {
    store().setPeriod({ mode: "month", monthKey: "2025-09" });
    store().setMode("year");
    const range = store().filters.dateRange;
    expect(ymd(range!.from!)).toEqual([2025, 1, 1]);
    expect(ymd(range!.to!)).toEqual([2025, 12, 31]);
  });
});
