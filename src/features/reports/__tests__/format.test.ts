import { describe, expect, it } from "vitest";

import { formatBahtCompact, formatBahtFixed } from "@/features/reports/format";

describe("formatBahtFixed", () => {
  it("always shows two decimals with thousands separators", () => {
    expect(formatBahtFixed(45000)).toBe("฿45,000.00");
    expect(formatBahtFixed(0)).toBe("฿0.00");
    expect(formatBahtFixed(1304.5)).toBe("฿1,304.50");
  });

  it("rounds to cents and never shows a minus zero", () => {
    expect(formatBahtFixed(10.005)).toBe("฿10.01");
    expect(formatBahtFixed(-0.001)).toBe("฿0.00");
  });

  it("signs negatives, and positives only when asked", () => {
    expect(formatBahtFixed(-250)).toBe("-฿250.00");
    expect(formatBahtFixed(15000, { sign: true })).toBe("+฿15,000.00");
    expect(formatBahtFixed(0, { sign: true })).toBe("฿0.00");
    expect(formatBahtFixed(-15000, { sign: true })).toBe("-฿15,000.00");
  });
});

describe("formatBahtCompact", () => {
  it("shortens axis labels", () => {
    expect(formatBahtCompact(0)).toBe("฿0");
    expect(formatBahtCompact(950)).toBe("฿950");
    expect(formatBahtCompact(45000)).toBe("฿45K");
    expect(formatBahtCompact(1200000)).toBe("฿1.2M");
  });
});
