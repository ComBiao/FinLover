import { afterEach, describe, expect, it, vi } from "vitest";

import { periodMonthKeys } from "@/features/transactions/period";
import { createTransaction, getTransactions } from "@/features/transactions/transactionsService";

const row = (id: string, date: string, overrides: Record<string, unknown> = {}) => ({
  id,
  walletId: "507f1f77bcf86cd799439011",
  categoryId: null,
  type: "expense",
  amount: 42,
  date,
  title: `Row ${id}`,
  ...overrides,
});

function mockFetch(handler: (url: string, init?: RequestInit) => { status?: number; body: unknown }) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const { status = 200, body } = handler(url, init);
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("periodMonthKeys", () => {
  it("covers one month, twelve months for a year, and every month a day range touches", () => {
    expect(periodMonthKeys({ mode: "month", monthKey: "2026-10" })).toEqual(["2026-10"]);
    expect(periodMonthKeys({ mode: "year", year: 2026 })).toEqual(
      Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`)
    );
    expect(
      periodMonthKeys({ mode: "day", from: new Date(2026, 10, 28), to: new Date(2027, 0, 3) })
    ).toEqual(["2026-11", "2026-12", "2027-01"]);
  });
});

describe("getTransactions", () => {
  it("fetches one request per month and returns domain objects newest first", async () => {
    const fetchMock = mockFetch((url) => ({
      body: {
        status: true,
        data: url.endsWith("2026-09")
          ? [row("a", "2026-09-30", { categoryId: "507f1f77bcf86cd799439022", note: "n" })]
          : [row("b", "2026-10-02")],
      },
    }));

    const result = await getTransactions(["2026-09", "2026-10"]);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/transactions?month=2026-09",
      "/api/v1/transactions?month=2026-10",
    ]);
    expect(result.map((transaction) => transaction.id)).toEqual(["b", "a"]);
    expect(result[1]).toMatchObject({ categoryId: "507f1f77bcf86cd799439022", note: "n" });
    expect(result[0].categoryId).toBeUndefined();
    // Local midnight, not UTC — would be the previous day in timezones behind UTC.
    expect([result[0].date.getFullYear(), result[0].date.getMonth(), result[0].date.getDate()]).toEqual([2026, 9, 2]);
  });

  it("rejects with the server's message when a month request fails", async () => {
    mockFetch(() => ({ status: 401, body: { status: false, error: { message: "Unauthorized" } } }));
    await expect(getTransactions(["2026-10"])).rejects.toThrow("Unauthorized");
  });
});

describe("createTransaction", () => {
  it("posts the API shape and returns the created row as a Transaction", async () => {
    const fetchMock = mockFetch(() => ({ status: 201, body: { status: true, data: row("new", "2026-10-03") } }));

    const created = await createTransaction({
      walletId: "507f1f77bcf86cd799439011",
      type: "expense",
      amount: 42,
      date: new Date(2026, 9, 3),
      title: "Lunch",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/transactions");
    expect(JSON.parse(String(init?.body))).toEqual({
      walletId: "507f1f77bcf86cd799439011",
      categoryId: null,
      type: "expense",
      amount: 42,
      date: "2026-10-03",
      title: "Lunch",
    });
    expect(created.id).toBe("new");
  });
});
