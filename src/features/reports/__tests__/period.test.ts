import { describe, expect, it } from "vitest";

import {
  MAX_BUCKETS,
  countBuckets,
  daysInRange,
  defaultRange,
  isIntervalAllowed,
  isValidISODate,
  presetRange,
  rangeLabel,
  shiftPresetRange,
  suggestedInterval,
  validateReportFilter,
} from "@/features/reports/period";

describe("presetRange", () => {
  it("weekly runs Monday to Sunday around the anchor", () => {
    // 2026-10-21 is a Wednesday
    expect(presetRange("weekly", "2026-10-21")).toEqual({ startDate: "2026-10-19", endDate: "2026-10-25" });
    expect(presetRange("weekly", "2026-10-19")).toEqual({ startDate: "2026-10-19", endDate: "2026-10-25" });
    // a Sunday still belongs to the week that started the Monday before
    expect(presetRange("weekly", "2026-10-25")).toEqual({ startDate: "2026-10-19", endDate: "2026-10-25" });
  });

  it("weekly crosses month and year boundaries", () => {
    expect(presetRange("weekly", "2026-12-31")).toEqual({ startDate: "2026-12-28", endDate: "2027-01-03" });
  });

  it("monthly covers the whole calendar month, including leap-year February", () => {
    expect(presetRange("monthly", "2026-10-21")).toEqual({ startDate: "2026-10-01", endDate: "2026-10-31" });
    expect(presetRange("monthly", "2028-02-10")).toEqual({ startDate: "2028-02-01", endDate: "2028-02-29" });
    expect(presetRange("monthly", "2026-02-10")).toEqual({ startDate: "2026-02-01", endDate: "2026-02-28" });
    expect(presetRange("monthly", "2026-12-15")).toEqual({ startDate: "2026-12-01", endDate: "2026-12-31" });
  });

  it("annual covers the whole calendar year", () => {
    expect(presetRange("annual", "2026-10-21")).toEqual({ startDate: "2026-01-01", endDate: "2026-12-31" });
  });

  it("defaults to the current month", () => {
    expect(defaultRange("2026-10-21")).toEqual({ startDate: "2026-10-01", endDate: "2026-10-31" });
  });
});

describe("shiftPresetRange", () => {
  it("steps a week at a time, staying on Monday to Sunday", () => {
    const week = presetRange("weekly", "2026-10-21");
    expect(shiftPresetRange("weekly", week, -1)).toEqual({ startDate: "2026-10-12", endDate: "2026-10-18" });
    expect(shiftPresetRange("weekly", week, 1)).toEqual({ startDate: "2026-10-26", endDate: "2026-11-01" });
  });

  it("steps a month at a time across a year boundary and into a shorter month", () => {
    expect(shiftPresetRange("monthly", presetRange("monthly", "2026-01-15"), -1)).toEqual({
      startDate: "2025-12-01",
      endDate: "2025-12-31",
    });
    expect(shiftPresetRange("monthly", presetRange("monthly", "2026-12-15"), 1)).toEqual({
      startDate: "2027-01-01",
      endDate: "2027-01-31",
    });
    expect(shiftPresetRange("monthly", presetRange("monthly", "2026-01-31"), 1)).toEqual({
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });
  });

  it("steps a year at a time", () => {
    expect(shiftPresetRange("annual", presetRange("annual", "2026-06-01"), -1)).toEqual({
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
  });
});

describe("rangeLabel", () => {
  it("names the period in English", () => {
    expect(rangeLabel("monthly", { startDate: "2026-10-01", endDate: "2026-10-31" })).toBe("October 2026");
    expect(rangeLabel("annual", { startDate: "2026-01-01", endDate: "2026-12-31" })).toBe("2026");
    expect(rangeLabel("weekly", { startDate: "2026-10-12", endDate: "2026-10-18" })).toBe("12 Oct – 18 Oct 2026");
    expect(rangeLabel("custom", { startDate: "2026-08-01", endDate: "2026-08-31" })).toBe("1 Aug 2026 – 31 Aug 2026");
  });

  it("writes both years when a week spans New Year", () => {
    expect(rangeLabel("weekly", { startDate: "2026-12-28", endDate: "2027-01-03" })).toBe("28 Dec 2026 – 3 Jan 2027");
  });

  it("asks for dates when they are not valid", () => {
    expect(rangeLabel("custom", { startDate: "", endDate: "2026-10-01" })).toBe("Select dates");
  });
});

describe("isValidISODate", () => {
  it("accepts real dates only", () => {
    expect(isValidISODate("2026-10-21")).toBe(true);
    expect(isValidISODate("2028-02-29")).toBe(true);
    expect(isValidISODate("2026-02-29")).toBe(false);
    expect(isValidISODate("2026-13-01")).toBe(false);
    expect(isValidISODate("2026-1-1")).toBe(false);
    expect(isValidISODate("")).toBe(false);
  });
});

describe("validateReportFilter (US8-1)", () => {
  const valid = { walletIds: ["w1"], startDate: "2026-09-01", endDate: "2026-09-30" };

  it("is empty for a good filter, including a single-day range", () => {
    expect(validateReportFilter(valid)).toEqual({});
    expect(validateReportFilter({ ...valid, startDate: "2026-09-05", endDate: "2026-09-05" })).toEqual({});
  });

  it("rejects an end date before the start date, on the end field", () => {
    expect(validateReportFilter({ ...valid, startDate: "2026-09-30", endDate: "2026-09-01" })).toEqual({
      endDate: "End date must be on or after the start date",
    });
  });

  it("requires at least one wallet", () => {
    expect(validateReportFilter({ ...valid, walletIds: [] })).toEqual({ walletIds: "Select at least 1 wallet" });
  });

  it("flags missing or impossible dates and reports every problem at once", () => {
    expect(validateReportFilter({ walletIds: [], startDate: "", endDate: "2026-02-31" })).toEqual({
      walletIds: "Select at least 1 wallet",
      startDate: "Choose a start date",
      endDate: "Choose an end date",
    });
  });
});

describe("intervals", () => {
  it("counts inclusive days", () => {
    expect(daysInRange("2026-10-01", "2026-10-01")).toBe(1);
    expect(daysInRange("2026-10-01", "2026-10-31")).toBe(31);
  });

  it("suggests daily up to 31 days, weekly up to 120, monthly beyond", () => {
    expect(suggestedInterval(1)).toBe("daily");
    expect(suggestedInterval(31)).toBe("daily");
    expect(suggestedInterval(32)).toBe("weekly");
    expect(suggestedInterval(120)).toBe("weekly");
    expect(suggestedInterval(121)).toBe("monthly");
  });

  it("counts buckets the way the API builds them", () => {
    expect(countBuckets("2026-10-01", "2026-10-31", "daily")).toBe(31);
    // Thu 1 Oct to Sat 31 Oct touches Mon 28 Sep, 5, 12, 19, 26 Oct = 5 weeks (first and last truncated)
    expect(countBuckets("2026-10-01", "2026-10-31", "weekly")).toBe(5);
    expect(countBuckets("2026-10-19", "2026-10-25", "weekly")).toBe(1);
    expect(countBuckets("2026-07-15", "2026-09-02", "monthly")).toBe(3);
    expect(countBuckets("2026-01-01", "2026-12-31", "monthly")).toBe(12);
    expect(countBuckets("2025-12-31", "2026-01-01", "monthly")).toBe(2);
  });

  it("disables intervals that would exceed the bucket limit", () => {
    expect(MAX_BUCKETS).toBe(400);
    expect(isIntervalAllowed("2026-01-01", "2026-12-31", "daily")).toBe(true); // 365
    expect(isIntervalAllowed("2025-01-01", "2026-12-31", "daily")).toBe(false); // 730
    expect(isIntervalAllowed("2025-01-01", "2026-12-31", "weekly")).toBe(true); // about 105
    expect(isIntervalAllowed("2000-01-01", "2026-12-31", "weekly")).toBe(false); // about 1400
    expect(isIntervalAllowed("2000-01-01", "2026-12-31", "monthly")).toBe(true); // 324
  });
});
