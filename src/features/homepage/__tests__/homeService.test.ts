import { afterEach, describe, expect, it, vi } from "vitest";
import { Utensils } from "lucide-react";

import { getHomeSummary } from "../services/homeService";

const fetchMock = vi.fn();

function respondWith(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
}

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const apiSummary = {
  month: "2026-10",
  walletId: "w2",
  balance: {
    hasWallets: true,
    totalBalance: 8000,
    savingGoal: { walletId: "w2", walletName: "Vacation", goal: 20000, current: 8000, percent: 40, remaining: 12000, reached: false },
  },
  income: 10000,
  expense: 450,
  net: { net: 9550, status: "surplus" },
  topCategories: [
    { rank: 1, categoryId: "c1", name: "Food", icon: "Utensils", color: "#FF5733", amount: 300 },
    { rank: 2, categoryId: null, name: "Others", icon: null, color: null, amount: 150 },
  ],
};

describe("homeService — getHomeSummary (#154)", () => {
  it("reads the month and wallet summary from the home summary API", async () => {
    respondWith({ status: true, data: apiSummary });

    const summary = await getHomeSummary("2026-10", "w2");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/home/summary?month=2026-10&walletId=w2");
    expect(summary.balance).toEqual(apiSummary.balance);
    expect(summary).toMatchObject({ month: "2026-10", walletId: "w2", income: 10000, expense: 450, net: { net: 9550, status: "surplus" } });
  });

  it("turns category icon names back into icons", async () => {
    respondWith({ status: true, data: apiSummary });

    const [food, others] = (await getHomeSummary("2026-10", "w2")).topCategories;

    expect(food).toEqual({ rank: 1, categoryId: "c1", name: "Food", icon: Utensils, color: "#FF5733", amount: 300 });
    expect(others).toEqual({ rank: 2, categoryId: null, name: "Others", icon: undefined, color: undefined, amount: 150 });
  });

  it("surfaces API errors to the query", async () => {
    respondWith({ status: false, error: { code: "NOT_FOUND", message: "Wallet not found" } }, 404);

    await expect(getHomeSummary("2026-10", "gone")).rejects.toMatchObject({ status: 404, message: "Wallet not found" });
  });
});
