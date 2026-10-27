// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ReportSummaryCards } from "@/features/reports/components/ReportSummaryCards";
import * as reportsService from "@/features/reports/reportsService";
import type { ReportFilter, ReportSummary } from "@/features/reports/types";
import { ApiClientError } from "@/lib/api/client";

const FILTER: ReportFilter = { walletIds: ["w1"], startDate: "2026-09-01", endDate: "2026-09-30" };

function renderCards() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ReportSummaryCards filter={FILTER} />
    </QueryClientProvider>
  );
}

const summary = (overrides: Partial<ReportSummary> = {}): ReportSummary => ({
  totalIncome: 45000,
  totalExpense: 30000,
  netCashFlow: 15000,
  transactionCount: 12,
  ...overrides,
});

describe("ReportSummaryCards (US8-2)", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => cleanup());

  it("shows income, expenses and a signed net with two decimals", async () => {
    vi.spyOn(reportsService, "getReportSummary").mockResolvedValue(summary());
    renderCards();

    expect(await screen.findByText("฿45,000.00")).toBeInTheDocument();
    expect(screen.getByText("Total Income")).toBeInTheDocument();
    expect(screen.getByText("Total Expenses")).toBeInTheDocument();
    expect(screen.getByText("฿30,000.00")).toBeInTheDocument();
    expect(screen.getByText("Net Cash Flow")).toBeInTheDocument();
    expect(screen.getByText("+฿15,000.00")).toHaveClass("text-success");
    expect(screen.queryByText("No transactions recorded in this period")).not.toBeInTheDocument();
  });

  it("shows a negative net in red without a plus", async () => {
    vi.spyOn(reportsService, "getReportSummary").mockResolvedValue(
      summary({ totalIncome: 100, totalExpense: 350.5, netCashFlow: -250.5 })
    );
    renderCards();

    expect(await screen.findByText("-฿250.50")).toHaveClass("text-destructive");
  });

  it("shows three zero cards and a message when the period has no transactions", async () => {
    vi.spyOn(reportsService, "getReportSummary").mockResolvedValue(
      summary({ totalIncome: 0, totalExpense: 0, netCashFlow: 0, transactionCount: 0 })
    );
    renderCards();

    expect(await screen.findAllByText("฿0.00")).toHaveLength(3);
    expect(screen.getByText("No transactions recorded in this period")).toBeInTheDocument();
  });

  it("shows a loading state before the data arrives", () => {
    vi.spyOn(reportsService, "getReportSummary").mockReturnValue(new Promise(() => {}));
    renderCards();

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("shows the server's message with a retry button that tries again", async () => {
    const spy = vi
      .spyOn(reportsService, "getReportSummary")
      .mockRejectedValueOnce(new ApiClientError("Wallet not found", 404))
      .mockResolvedValueOnce(summary());
    renderCards();

    expect(await screen.findByRole("alert")).toHaveTextContent("Wallet not found");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText("฿45,000.00")).toBeInTheDocument());
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
