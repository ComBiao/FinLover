import { describe, expect, it } from "vitest";
import {
  computeOccurrenceDate,
  formatCadenceString,
  formatEndConditionSummary,
  formatShortDateWithAbbrMonth,
  getDueOccurrences,
  getResumeNextRunDate,
} from "../dateCadence";
import type { RecurringRule } from "../types";

describe("dateCadence — Month-end clamping (US4-1)", () => {
  it("clamps Jan 31 to Feb 28 in a non-leap year (2026) and restores to Mar 31", () => {
    const start = "2026-01-31";
    const anchor = 31;

    // k=0 is start date
    expect(computeOccurrenceDate(start, anchor, 1, "months", 0)).toBe("2026-01-31");
    // k=1: Feb 2026 (non-leap year has 28 days)
    expect(computeOccurrenceDate(start, anchor, 1, "months", 1)).toBe("2026-02-28");
    // k=2: Mar 2026 (restores to 31)
    expect(computeOccurrenceDate(start, anchor, 1, "months", 2)).toBe("2026-03-31");
    // k=3: Apr 2026 (clamped to 30)
    expect(computeOccurrenceDate(start, anchor, 1, "months", 3)).toBe("2026-04-30");
    // k=4: May 2026 (restores to 31)
    expect(computeOccurrenceDate(start, anchor, 1, "months", 4)).toBe("2026-05-31");
  });

  it("clamps Jan 31 to Feb 29 in a leap year (2028)", () => {
    const start = "2028-01-31";
    const anchor = 31;

    // k=1: Feb 2028 (leap year has 29 days)
    expect(computeOccurrenceDate(start, anchor, 1, "months", 1)).toBe("2028-02-29");
    // k=2: Mar 2028 (restores to 31)
    expect(computeOccurrenceDate(start, anchor, 1, "months", 2)).toBe("2028-03-31");
  });

  it("handles day and week intervals correctly", () => {
    const start = "2026-10-01";
    // Every 5 days
    expect(computeOccurrenceDate(start, 1, 5, "days", 1)).toBe("2026-10-06");
    expect(computeOccurrenceDate(start, 1, 5, "days", 2)).toBe("2026-10-11");

    // Every 2 weeks
    expect(computeOccurrenceDate(start, 1, 2, "weeks", 1)).toBe("2026-10-15");
    expect(computeOccurrenceDate(start, 1, 2, "weeks", 2)).toBe("2026-10-29");
  });

  it("handles year intervals with leap day clamping", () => {
    const leapStart = "2024-02-29";
    const anchor = 29;

    // 2025 non-leap -> clamped to Feb 28
    expect(computeOccurrenceDate(leapStart, anchor, 1, "years", 1)).toBe("2025-02-28");
    // 2028 leap -> restores to Feb 29
    expect(computeOccurrenceDate(leapStart, anchor, 4, "years", 1)).toBe("2028-02-29");
  });
});

describe("dateCadence — Overdue Resume Lifecycle (US4-4)", () => {
  it("advances next run date to the next upcoming cycle without retroactive catch-up", () => {
    const rule = {
      startDate: "2026-01-15",
      anchorDay: 15,
      intervalN: 1,
      intervalUnit: "months" as const,
      nextRunDate: "2026-03-15", // overdue
    };

    const simulatedToday = "2026-10-23";
    const { nextRunDate, skippedCycles } = getResumeNextRunDate(rule, simulatedToday);

    // The next 15th on or after Oct 23 is Nov 15, 2026!
    expect(nextRunDate).toBe("2026-11-15");
    expect(skippedCycles).toBeGreaterThan(0);
  });

  it("keeps future nextRunDate intact if not overdue", () => {
    const rule = {
      startDate: "2026-10-01",
      anchorDay: 1,
      intervalN: 1,
      intervalUnit: "months" as const,
      nextRunDate: "2026-11-01",
    };

    const simulatedToday = "2026-10-23";
    const { nextRunDate, skippedCycles } = getResumeNextRunDate(rule, simulatedToday);

    expect(nextRunDate).toBe("2026-11-01");
    expect(skippedCycles).toBe(0);
  });
});

describe("dateCadence — getDueOccurrences simulation", () => {
  it("calculates exact occurrences up to target date and respects occurrence limit", () => {
    const rule: RecurringRule = {
      id: "rule-1",
      title: "Gym Membership",
      amount: 1500,
      type: "expense",
      walletId: "wallet-1",
      intervalN: 1,
      intervalUnit: "months",
      anchorDay: 1,
      startDate: "2026-01-01",
      nextRunDate: "2026-01-01",
      postedCount: 0,
      endType: "count",
      totalOccurrences: 3,
      status: "active",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };

    // Simulate all the way to end of year
    const due = getDueOccurrences(rule, "2026-12-31");
    // Should only yield 3 occurrences because limit is 3
    expect(due).toHaveLength(3);
    expect(due.map((d) => d.date)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
    expect(due.map((d) => d.occurrenceNumber)).toEqual([1, 2, 3]);
  });

  it("respects end date condition", () => {
    const rule: RecurringRule = {
      id: "rule-2",
      title: "Quarterly Software",
      amount: 500,
      type: "expense",
      walletId: "wallet-1",
      intervalN: 1,
      intervalUnit: "months",
      anchorDay: 1,
      startDate: "2026-01-01",
      nextRunDate: "2026-01-01",
      postedCount: 0,
      endType: "date",
      endDate: "2026-03-15",
      status: "active",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };

    const due = getDueOccurrences(rule, "2026-12-31");
    // 2026-01-01, 2026-02-01, 2026-03-01 are <= 2026-03-15
    expect(due).toHaveLength(3);
    expect(due.map((d) => d.date)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
  });
});

describe("dateCadence — formatCadenceString & formatShortDateWithAbbrMonth", () => {
  it("formats cadences nicely with weekday for weekly", () => {
    expect(formatCadenceString({ intervalN: 1, intervalUnit: "days", startDate: "2026-10-01" })).toBe("Every Day");
    expect(formatCadenceString({ intervalN: 3, intervalUnit: "days", startDate: "2026-10-01" })).toBe("Every 3 Days");
    // 2026-10-01 is Thursday
    expect(formatCadenceString({ intervalN: 2, intervalUnit: "weeks", startDate: "2026-10-01" })).toBe("Every 2 Weeks (Thu)");
    expect(formatCadenceString({ intervalN: 1, intervalUnit: "weeks", startDate: "2026-10-01" })).toBe("Every Week (Thu)");
    expect(formatCadenceString({ intervalN: 1, intervalUnit: "months", startDate: "2026-01-28", anchorDay: 28 })).toBe("Monthly on day 28");
    expect(formatCadenceString({ intervalN: 1, intervalUnit: "months", startDate: "2026-01-29", anchorDay: 29 })).toBe("Monthly on day 29");
    expect(formatCadenceString({ intervalN: 1, intervalUnit: "months", startDate: "2026-01-31", anchorDay: 31 })).toBe("Monthly on day 31");
    expect(formatCadenceString({ intervalN: 1, intervalUnit: "years", startDate: "2026-10-23" })).toBe("Every Year");
  });

  it("formats short date with space and 4-digit year (dd Mon YYYY)", () => {
    expect(formatShortDateWithAbbrMonth("2026-10-23")).toBe("23 Oct 2026");
    expect(formatShortDateWithAbbrMonth("2026-01-05")).toBe("05 Jan 2026");
    expect(formatShortDateWithAbbrMonth("2027-12-31")).toBe("31 Dec 2027");
  });

  it("formats end condition summaries with newlines for ongoing and completed", () => {
    expect(
      formatEndConditionSummary({
        endType: "count",
        totalOccurrences: 6,
        postedCount: 2,
      })
    ).toBe("Ongoing,\n(2 of 6 posted)");

    expect(
      formatEndConditionSummary({
        endType: "count",
        totalOccurrences: 6,
        postedCount: 6,
      })
    ).toBe("Completed,\n(6 of 6 posted)");

    expect(formatEndConditionSummary({ endType: "never" })).toBe("Indefinite");
  });
});

