// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { cn, formatBaht } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("formatBaht", () => {
  it("shows no decimals for whole amounts", () => {
    expect(formatBaht(10100)).toBe("฿10,100");
    expect(formatBaht(0)).toBe("฿0");
  });

  it("shows exactly 2 decimals when there is a fraction", () => {
    expect(formatBaht(4500.5)).toBe("฿4,500.50");
    expect(formatBaht(4500.55)).toBe("฿4,500.55");
  });

  it("rounds to 2 decimals before deciding", () => {
    expect(formatBaht(10.001)).toBe("฿10");
    expect(formatBaht(10.006)).toBe("฿10.01");
  });

  it("prefixes negatives with -", () => {
    expect(formatBaht(-1000)).toBe("-฿1,000");
    expect(formatBaht(-1000, { sign: true })).toBe("-฿1,000");
  });

  it("prefixes positives with + only when sign is set", () => {
    expect(formatBaht(1000)).toBe("฿1,000");
    expect(formatBaht(1000, { sign: true })).toBe("+฿1,000");
    expect(formatBaht(0, { sign: true })).toBe("฿0");
  });
});
