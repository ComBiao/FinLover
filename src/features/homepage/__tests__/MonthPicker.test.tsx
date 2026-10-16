// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { Tag, Wallet as WalletIcon } from "lucide-react";

import { MonthPicker } from "../components/MonthPicker";
import { HomePage } from "../components/HomePage";
import {
  currentMonthKey,
  monthKeyLabel,
  parseMonthKey,
  shiftMonthKey,
} from "../month";
import { useActiveWallet } from "@/features/wallets/store/useActiveWallet";
import { useBalanceVisibility } from "@/features/wallets/store/useBalanceVisibility";
import { useTransactionModal } from "@/features/transactions/store/useTransactionModal";
import * as walletsService from "@/features/wallets/walletsService";
import * as transactionsService from "@/features/transactions/transactionsService";
import * as categoriesService from "@/features/categories/categoriesService";
import * as homeService from "../services/homeService";
import { CURRENT_USER_QUERY_KEY } from "@/features/auth/hooks/useCurrentUser";
import type { Wallet } from "@/types/wallet";
import type { Category } from "@/types/category";
import type { Transaction } from "@/types/transaction";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const testWallets: Wallet[] = [
  {
    id: "wallet-1",
    name: "Main Cash",
    balance: 5000,
    isDefault: true,
    color: "#4A4757",
    isSaving: false,
    icon: WalletIcon,
    type: "cash",
  },
];

const testCategories: Category[] = [
  { id: "cat-food", name: "Food & Drinks", type: "expense", color: "#FF5733", icon: Tag },
];

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  queryClient.setQueryData(CURRENT_USER_QUERY_KEY, {
    id: "user-1",
    email: "test@example.com",
    name: "Alex",
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("Task 59 — MonthPicker Component", () => {
  afterEach(() => cleanup());

  it("renders current month label and navigation buttons", () => {
    const onValueChange = vi.fn();
    render(<MonthPicker value="2026-10" onValueChange={onValueChange} />);

    expect(screen.getByRole("button", { name: "Previous month" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next month" })).toBeInTheDocument();
    expect(screen.getByText("October 2026")).toBeInTheDocument();
  });

  it("calls onValueChange with past month when clicking Previous month", () => {
    const onValueChange = vi.fn();
    render(<MonthPicker value="2026-10" onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("2026-09");
  });

  it("calls onValueChange with future month when clicking Next month", () => {
    const onValueChange = vi.fn();
    render(<MonthPicker value="2026-10" onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("2026-11");
  });

  it("steps across year boundaries correctly (December -> January)", () => {
    const onValueChange = vi.fn();
    render(<MonthPicker value="2026-12" onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(onValueChange).toHaveBeenCalledWith("2027-01");
  });

  it("steps across year boundaries correctly (January -> December)", () => {
    const onValueChange = vi.fn();
    render(<MonthPicker value="2026-01" onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(onValueChange).toHaveBeenCalledWith("2025-12");
  });

  it("opens popover grid and selects a specific month", async () => {
    const onValueChange = vi.fn();
    render(<MonthPicker value="2026-10" onValueChange={onValueChange} />);

    // Open popover by clicking month label trigger
    fireEvent.click(screen.getByText("October 2026"));

    // Verify month grid is rendered and select March
    const marchBtn = await screen.findByRole("button", { name: /^Mar/i });
    fireEvent.click(marchBtn);

    expect(onValueChange).toHaveBeenCalledWith("2026-03");
  });

  it("navigates calendar year in popover and selects month from new year", async () => {
    const onValueChange = vi.fn();
    render(<MonthPicker value="2026-10" onValueChange={onValueChange} />);

    fireEvent.click(screen.getByText("October 2026"));

    // Click next year button in popover
    const nextYearBtn = await screen.findByRole("button", { name: "Next year" });
    fireEvent.click(nextYearBtn);

    // Year in popover header should now be 2027
    expect(screen.getByText("2027")).toBeInTheDocument();

    // Select January in 2027
    const janBtn = screen.getByRole("button", { name: /^Jan/i });
    fireEvent.click(janBtn);

    expect(onValueChange).toHaveBeenCalledWith("2027-01");
  });

  it("resets to current month when clicking 'This month' in popover", async () => {
    const onValueChange = vi.fn();
    const today = currentMonthKey();
    render(<MonthPicker value="2024-05" onValueChange={onValueChange} />);

    fireEvent.click(screen.getByText("May 2024"));

    const thisMonthBtn = await screen.findByRole("button", { name: "This month" });
    fireEvent.click(thisMonthBtn);

    expect(onValueChange).toHaveBeenCalledWith(today);
  });
});

describe("Task 59 — Month Navigation on HomePage", () => {
  const currentKey = currentMonthKey();
  const { year, month } = parseMonthKey(currentKey);
  const prevMonthKey = shiftMonthKey(currentKey, -1);
  const nextMonthKey = shiftMonthKey(currentKey, 1);

  const currentMonthTx: Transaction = {
    id: "tx-curr",
    walletId: "wallet-1",
    categoryId: "cat-food",
    type: "expense",
    amount: 250,
    date: new Date(year, month - 1, 15, 12, 0),
    title: "Current Month Lunch",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useBalanceVisibility.setState({ isVisible: true });
    useActiveWallet.setState({ activeWalletId: "all" });
    useTransactionModal.setState({
      isOpen: false,
      defaultType: "expense",
      editingTransaction: null,
      deletingTransaction: null,
    });

    vi.spyOn(walletsService, "getWallets").mockResolvedValue(testWallets);
    vi.spyOn(categoriesService, "getCategories").mockResolvedValue(testCategories);
    vi.spyOn(transactionsService, "getTransactions").mockImplementation(async (months) => {
      // Return tx only if current month is in requested months
      if (months.includes(currentKey)) {
        return [currentMonthTx];
      }
      return [];
    });
    vi.spyOn(homeService, "getHomeSummary").mockImplementation(async (targetMonth, walletId) => ({
      month: targetMonth,
      walletId,
      balance: { totalBalance: 5000, hasWallets: true, savingGoal: null },
      income: 0,
      expense: targetMonth === currentKey ? 250 : 0,
      net: { net: targetMonth === currentKey ? -250 : 0, status: targetMonth === currentKey ? "overspending" : "even" },
      topCategories: [],
    }));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("navigates to previous month (past) and displays empty-month state when no data exists", async () => {
    const currentLabel = monthKeyLabel(currentKey);
    const prevLabel = monthKeyLabel(prevMonthKey);

    renderWithClient(<HomePage />);

    // Initially displays current month's transactions
    expect(await screen.findByRole("heading", { name: `Transactions · ${currentLabel}` })).toBeInTheDocument();
    expect(await screen.findAllByText("Current Month Lunch")).toHaveLength(2);

    // Click Previous month button in MonthPicker
    const prevMonthBtn = screen.getByRole("button", { name: "Previous month" });
    fireEvent.click(prevMonthBtn);

    // Header updates to previous month
    expect(await screen.findByRole("heading", { name: `Transactions · ${prevLabel}` })).toBeInTheDocument();

    // Empty-month state is displayed
    expect(await screen.findByText("No transactions this month yet")).toBeInTheDocument();
    expect(
      screen.getByText(`Nothing recorded in All wallets for ${prevLabel}.`)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add a transaction" })).toBeInTheDocument();

    // Previous month has no transactions, so current month items are not displayed
    expect(screen.queryByText("Current Month Lunch")).not.toBeInTheDocument();
  });

  it("navigates to next month (future) and displays empty-month state", async () => {
    const currentLabel = monthKeyLabel(currentKey);
    const nextLabel = monthKeyLabel(nextMonthKey);

    renderWithClient(<HomePage />);

    expect(await screen.findByRole("heading", { name: `Transactions · ${currentLabel}` })).toBeInTheDocument();
    expect(await screen.findAllByText("Current Month Lunch")).toHaveLength(2);

    // Click Next month button in MonthPicker
    const nextMonthBtn = screen.getByRole("button", { name: "Next month" });
    fireEvent.click(nextMonthBtn);

    // Header updates to next month
    expect(await screen.findByRole("heading", { name: `Transactions · ${nextLabel}` })).toBeInTheDocument();

    // Empty-month state is displayed for the future month
    expect(await screen.findByText("No transactions this month yet")).toBeInTheDocument();
    expect(
      screen.getByText(`Nothing recorded in All wallets for ${nextLabel}.`)
    ).toBeInTheDocument();
    expect(screen.queryByText("Current Month Lunch")).not.toBeInTheDocument();
  });

  it("navigates back and forth between months and restores transaction view correctly", async () => {
    const currentLabel = monthKeyLabel(currentKey);

    renderWithClient(<HomePage />);

    expect(await screen.findByRole("heading", { name: `Transactions · ${currentLabel}` })).toBeInTheDocument();

    // Step back to previous month (empty)
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(await screen.findByText("No transactions this month yet")).toBeInTheDocument();
    expect(screen.queryByText("Current Month Lunch")).not.toBeInTheDocument();

    // Step forward back to current month (has transactions)
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(await screen.findByRole("heading", { name: `Transactions · ${currentLabel}` })).toBeInTheDocument();
    expect(await screen.findAllByText("Current Month Lunch")).toHaveLength(2);
    expect(screen.queryByText("No transactions this month yet")).not.toBeInTheDocument();
  });
});
