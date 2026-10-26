// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ReportPage from "@/features/reports/components/ReportPage";
import { defaultRange } from "@/features/reports/period";
import * as reportsService from "@/features/reports/reportsService";
import * as walletsService from "@/features/wallets/walletsService";
import type { Wallet } from "@/types/wallet";

vi.mock("@/features/reports/components/CashFlowChart", () => ({
  CashFlowChart: () => <div data-testid="chart" />,
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const wallet = (id: string, name: string) => ({ id, name, balance: 0 }) as unknown as Wallet;
const WALLETS = [wallet("w1", "Cash"), wallet("w2", "Bank")];

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ReportPage />
    </QueryClientProvider>
  );
}

describe("ReportPage (US8-1 to US8-3)", () => {
  let summary: ReturnType<typeof vi.spyOn>;
  let cashFlow: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    summary = vi.spyOn(reportsService, "getReportSummary").mockResolvedValue({
      totalIncome: 45000,
      totalExpense: 30000,
      netCashFlow: 15000,
      transactionCount: 12,
    });
    cashFlow = vi.spyOn(reportsService, "getCashFlow").mockResolvedValue({
      interval: "daily",
      suggestedInterval: "daily",
      buckets: [{ label: "2026-10-01", start: "2026-10-01", end: "2026-10-01", income: 100, expense: 50 }],
    });
  });
  afterEach(() => cleanup());

  it("loads every wallet for the current month into the summary and the cash flow", async () => {
    vi.spyOn(walletsService, "getWallets").mockResolvedValue(WALLETS);
    renderPage();

    const month = defaultRange();
    await waitFor(() =>
      expect(summary).toHaveBeenCalledWith({ walletIds: ["w1", "w2"], startDate: month.startDate, endDate: month.endDate })
    );
    expect(await screen.findByText("+฿15,000.00")).toBeInTheDocument();
    expect(await screen.findByTestId("chart")).toBeInTheDocument();
    // the two sections Ice builds are placeholders for now
    expect(screen.getByText("Category distribution")).toBeInTheDocument();
    expect(screen.getByText("Running balance")).toBeInTheDocument();
  });

  it("leaves shared wallets out because the reports API answers 404 for them", async () => {
    const shared = { ...wallet("w3", "Housemate Fund"), isShared: true } as Wallet;
    vi.spyOn(walletsService, "getWallets").mockResolvedValue([...WALLETS, shared]);
    renderPage();

    const month = defaultRange();
    await waitFor(() =>
      expect(summary).toHaveBeenCalledWith({ walletIds: ["w1", "w2"], startDate: month.startDate, endDate: month.endDate })
    );
    expect(summary).not.toHaveBeenCalledWith(expect.objectContaining({ walletIds: expect.arrayContaining(["w3"]) }));
  });

  it("does not call any report API while the wallets are still loading", () => {
    vi.spyOn(walletsService, "getWallets").mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByRole("status", { name: "Loading filters" })).toBeInTheDocument();
    expect(summary).not.toHaveBeenCalled();
    expect(cashFlow).not.toHaveBeenCalled();
  });

  it("shows an error and does not apply the filter when the end date is before the start date", async () => {
    vi.spyOn(walletsService, "getWallets").mockResolvedValue(WALLETS);
    renderPage();
    await screen.findByText("+฿15,000.00");
    const callsBefore = summary.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-09-30" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-09-01" } });

    expect(await screen.findByText("End date must be on or after the start date")).toBeInTheDocument();
    // wait past the debounce: nothing new may have been requested
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(summary.mock.calls.length).toBe(callsBefore);
  });

  it("applies a valid custom range once the dates are fixed", async () => {
    vi.spyOn(walletsService, "getWallets").mockResolvedValue(WALLETS);
    renderPage();
    await screen.findByText("+฿15,000.00");

    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-09-30" } });

    await waitFor(() =>
      expect(summary).toHaveBeenLastCalledWith({ walletIds: ["w1", "w2"], startDate: "2026-09-01", endDate: "2026-09-30" })
    );
  });

  it("asks for at least one wallet and keeps what is on screen when all are unchecked", async () => {
    vi.spyOn(walletsService, "getWallets").mockResolvedValue(WALLETS);
    renderPage();
    await screen.findByText("+฿15,000.00");
    const callsBefore = summary.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Wallets" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "Cash" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Bank" }));

    expect(await screen.findByText("Select at least 1 wallet")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(summary.mock.calls.length).toBe(callsBefore);
    expect(screen.getByText("+฿15,000.00")).toBeInTheDocument();
  });

  it("points to Wallets when the user has none", async () => {
    vi.spyOn(walletsService, "getWallets").mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("Create a wallet to start seeing your reports.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Wallets" })).toHaveAttribute("href", "/wallets");
    expect(summary).not.toHaveBeenCalled();
  });

  it("shows an error with retry when the wallets fail to load", async () => {
    const spy = vi
      .spyOn(walletsService, "getWallets")
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(WALLETS);
    renderPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("+฿15,000.00")).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
