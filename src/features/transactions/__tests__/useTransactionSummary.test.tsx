// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { SUMMARY_SEARCH_DELAY_MS, useTransactionSummary } from "../hooks/useTransactionSummary";
import type { TransactionPeriod } from "../period";
import { DEFAULT_TRANSACTION_FILTERS, type TransactionFilters } from "@/types/transaction";

const fetchMock = vi.fn();
const OCTOBER: TransactionPeriod = { mode: "month", monthKey: "2026-10" };

function requestedQuery(call = fetchMock.mock.calls.length - 1) {
  const url = new URL(fetchMock.mock.calls[call][0], "http://localhost");
  expect(url.pathname).toBe("/api/v1/transactions/summary");
  return Object.fromEntries(url.searchParams);
}

function renderSummary(initial: { period: TransactionPeriod; filters: TransactionFilters }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(({ period, filters }) => useTransactionSummary(period, filters), { initialProps: initial, wrapper });
}

beforeEach(() => {
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ status: true, data: { totalIncome: 60300, totalExpense: 7495, netBalance: 52805 } })));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("useTransactionSummary (#158)", () => {
  it("requests the period's inclusive date range and returns the server totals", async () => {
    const { result } = renderSummary({ period: OCTOBER, filters: DEFAULT_TRANSACTION_FILTERS });

    await waitFor(() => expect(result.current.data).toEqual({ totalIncome: 60300, totalExpense: 7495, netBalance: 52805 }));
    expect(requestedQuery()).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });

  it.each<[string, TransactionPeriod, Record<string, string>]>([
    ["a year", { mode: "year", year: 2026 }, { from: "2026-01-01", to: "2026-12-31" }],
    ["a day range", { mode: "day", from: new Date(2026, 8, 28), to: new Date(2026, 9, 4) }, { from: "2026-09-28", to: "2026-10-04" }],
  ])("covers %s", async (_name, period, range) => {
    renderSummary({ period, filters: DEFAULT_TRANSACTION_FILTERS });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(requestedQuery()).toEqual(range);
  });

  it("re-requests with the new filters whenever they change", async () => {
    const { rerender } = renderSummary({ period: OCTOBER, filters: DEFAULT_TRANSACTION_FILTERS });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender({ period: OCTOBER, filters: { ...DEFAULT_TRANSACTION_FILTERS, walletId: "w1", categoryId: "c1", type: "expense" } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(requestedQuery()).toEqual({ from: "2026-10-01", to: "2026-10-31", walletId: "w1", categoryId: "c1", type: "expense" });
  });

  it("waits for the search box to settle before sending the search", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { rerender } = renderSummary({ period: OCTOBER, filters: DEFAULT_TRANSACTION_FILTERS });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender({ period: OCTOBER, filters: { ...DEFAULT_TRANSACTION_FILTERS, search: "  lun" } });
    rerender({ period: OCTOBER, filters: { ...DEFAULT_TRANSACTION_FILTERS, search: "  lunch " } });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(SUMMARY_SEARCH_DELAY_MS); });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(requestedQuery()).toMatchObject({ search: "lunch" });
  });
});
