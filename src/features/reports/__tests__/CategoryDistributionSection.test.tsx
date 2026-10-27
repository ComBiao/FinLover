// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CategoryDistributionSection } from "@/features/reports/components/CategoryDistributionSection";
import { NO_COLOR, itemKey, sliceColor } from "@/features/reports/components/DonutCard";
import * as distributionService from "@/features/reports/distributionService";
import type { CategoryDistributionItem, CategoryDistributionResponse } from "@/shared/contracts";
import type { ReportFilter } from "@/features/reports/types";

// Recharts has no layout in jsdom; the section and legend are what these tests cover.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return { ...actual, ResponsiveContainer: () => <div data-testid="donut" /> };
});

const FILTER: ReportFilter = { walletIds: ["w1"], startDate: "2026-09-01", endDate: "2026-09-30" };

const food: CategoryDistributionItem = {
  categoryId: "c1",
  name: "Food & Drinks",
  icon: "Utensils",
  color: "#EA580C",
  amount: 600,
  percentage: 60.0,
};
const noCategory: CategoryDistributionItem = {
  categoryId: null,
  name: "Other (No Category)",
  icon: null,
  color: null,
  amount: 400,
  percentage: 40.0,
};

const expenseOnly: CategoryDistributionResponse = {
  income: { total: 0, items: [] },
  expense: { total: 1000, items: [food, noCategory] },
};

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CategoryDistributionSection {...FILTER} />
    </QueryClientProvider>
  );
}

describe("donut item mapping", () => {
  it("uses grey for a missing colour and a fixed key for a missing category id", () => {
    expect(sliceColor(noCategory)).toBe(NO_COLOR);
    expect(sliceColor(food)).toBe("#EA580C");
    expect(itemKey(noCategory)).toBe("no-category");
    expect(itemKey(noCategory)).not.toBe(itemKey(food));
  });
});

describe("CategoryDistributionSection (US8-4)", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => cleanup());

  it("shows an empty card for the side without transactions and the other side as usual", async () => {
    vi.spyOn(distributionService, "getCategoryDistribution").mockResolvedValue(expenseOnly);
    renderSection();

    expect(await screen.findByText("No income transactions for this period")).toBeInTheDocument();
    expect(screen.getAllByTestId("donut")).toHaveLength(1);
    expect(screen.getByText("Other (No Category)")).toBeInTheDocument();
    expect(screen.getByText("60.0%")).toBeInTheDocument();
    expect(screen.getByText("40.0%")).toBeInTheDocument();
    expect(screen.getByText("฿600.00")).toBeInTheDocument();
  });

  it("shows the section's empty state when both sides are empty", async () => {
    vi.spyOn(distributionService, "getCategoryDistribution").mockResolvedValue({
      income: { total: 0, items: [] },
      expense: { total: 0, items: [] },
    });
    renderSection();

    expect(await screen.findByText("No transactions recorded in this period")).toBeInTheDocument();
    expect(screen.queryByTestId("donut")).toBeNull();
  });
});
