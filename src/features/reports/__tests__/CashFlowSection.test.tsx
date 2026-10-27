// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RANGE_TOO_LARGE_MESSAGE } from "@/features/reports/cashFlowFormat";
import { CashFlowSection } from "@/features/reports/components/CashFlowSection";
import * as reportsService from "@/features/reports/reportsService";
import type { CashFlowResponse, ReportFilter } from "@/features/reports/types";
import { ApiClientError } from "@/lib/api/client";

// The chart itself is Recharts; these tests are about the section around it.
vi.mock("@/features/reports/components/CashFlowChart", () => ({
  CashFlowChart: ({ buckets, interval }: { buckets: unknown[]; interval: string }) => (
    <div data-testid="chart" data-interval={interval} data-buckets={buckets.length} />
  ),
}));

const THREE_MONTHS: ReportFilter = { walletIds: ["w1"], startDate: "2026-07-01", endDate: "2026-09-30" };

const response = (overrides: Partial<CashFlowResponse> = {}): CashFlowResponse => ({
  interval: "weekly",
  suggestedInterval: "weekly",
  buckets: [
    { label: "2026-07-01", start: "2026-07-01", end: "2026-07-05", income: 0, expense: 300 },
    { label: "2026-07-06", start: "2026-07-06", end: "2026-07-12", income: 1000, expense: 200 },
  ],
  ...overrides,
});

function renderSection(filter: ReportFilter = THREE_MONTHS) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <CashFlowSection filter={filter} />
    </QueryClientProvider>
  );
  return {
    ...view,
    rerenderWith: (next: ReportFilter) =>
      view.rerender(
        <QueryClientProvider client={client}>
          <CashFlowSection filter={next} />
        </QueryClientProvider>
      ),
  };
}

const pressed = (name: string) => screen.getByRole("button", { name }).getAttribute("aria-pressed");

describe("CashFlowSection (US8-3)", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => cleanup());

  it("first asks without an interval and starts the toggle on the server's suggestion", async () => {
    const spy = vi.spyOn(reportsService, "getCashFlow").mockResolvedValue(response());
    renderSection();

    expect(await screen.findByTestId("chart")).toHaveAttribute("data-interval", "weekly");
    expect(spy).toHaveBeenCalledWith(THREE_MONTHS, undefined);
    expect(pressed("Weekly")).toBe("true");
    expect(pressed("Daily")).toBe("false");
    expect(pressed("Monthly")).toBe("false");
  });

  it("asks for the interval that is picked", async () => {
    const spy = vi.spyOn(reportsService, "getCashFlow").mockImplementation(async (_filter, interval) =>
      response({ interval: interval ?? "weekly" })
    );
    renderSection();
    await screen.findByTestId("chart");

    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith(THREE_MONTHS, "monthly"));
    await waitFor(() => expect(screen.getByTestId("chart")).toHaveAttribute("data-interval", "monthly"));
    expect(pressed("Monthly")).toBe("true");
  });

  it("goes back to the suggestion when the filter changes", async () => {
    const spy = vi.spyOn(reportsService, "getCashFlow").mockImplementation(async (_filter, interval) =>
      response({ interval: interval ?? "weekly" })
    );
    const { rerenderWith } = renderSection();
    await screen.findByTestId("chart");
    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    await waitFor(() => expect(pressed("Monthly")).toBe("true"));

    const next = { ...THREE_MONTHS, endDate: "2026-10-31" };
    rerenderWith(next);

    await waitFor(() => expect(spy).toHaveBeenCalledWith(next, undefined));
    await waitFor(() => expect(pressed("Weekly")).toBe("true"));
  });

  it("draws a chart when only some buckets have income (a zero-income bucket is fine)", async () => {
    vi.spyOn(reportsService, "getCashFlow").mockResolvedValue(response());
    renderSection();

    expect(await screen.findByTestId("chart")).toHaveAttribute("data-buckets", "2");
  });

  it("shows the empty state instead of a flat chart when every bucket is zero", async () => {
    vi.spyOn(reportsService, "getCashFlow").mockResolvedValue(
      response({ buckets: [{ label: "2026-07-01", start: "2026-07-01", end: "2026-07-05", income: 0, expense: 0 }] })
    );
    renderSection();

    expect(await screen.findByText("No transactions recorded in this period")).toBeInTheDocument();
    expect(screen.queryByTestId("chart")).not.toBeInTheDocument();
  });

  it("explains a too-large range and lets the user retry", async () => {
    vi.spyOn(reportsService, "getCashFlow").mockRejectedValue(
      new ApiClientError("One or more fields are invalid", 400, { interval: "too many buckets" })
    );
    renderSection();

    expect(await screen.findByRole("alert")).toHaveTextContent(RANGE_TOO_LARGE_MESSAGE);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows the server's message for other errors", async () => {
    vi.spyOn(reportsService, "getCashFlow").mockRejectedValue(new ApiClientError("Wallet not found", 404));
    renderSection();

    expect(await screen.findByRole("alert")).toHaveTextContent("Wallet not found");
  });

  it("disables intervals that would exceed 400 buckets", async () => {
    vi.spyOn(reportsService, "getCashFlow").mockResolvedValue(response({ suggestedInterval: "monthly", interval: "monthly" }));
    // 2 years: 731 daily buckets (too many), about 105 weekly, 24 monthly
    renderSection({ walletIds: ["w1"], startDate: "2025-01-01", endDate: "2026-12-31" });
    await screen.findByTestId("chart");

    expect(screen.getByRole("button", { name: "Daily" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Weekly" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Monthly" })).toBeEnabled();
  });
});
