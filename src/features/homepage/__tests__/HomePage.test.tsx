// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { PiggyBank, Tag, Wallet as WalletIcon } from "lucide-react";

import { HomePage } from "../components/HomePage";
import { useActiveWallet } from "@/features/wallets/store/useActiveWallet";
import { useBalanceVisibility } from "@/features/wallets/store/useBalanceVisibility";
import { useTransactionModal } from "@/features/transactions/store/useTransactionModal";
import * as walletsService from "@/features/wallets/walletsService";
import * as transactionsService from "@/features/transactions/transactionsService";
import * as categoriesService from "@/features/categories/categoriesService";
import * as homeService from "../services/homeService";
import { currentMonthKey, monthKeyLabel, parseMonthKey } from "../month";
import type { Wallet } from "@/types/wallet";
import type { Category } from "@/types/category";
import type { Transaction } from "@/types/transaction";
import { CURRENT_USER_QUERY_KEY } from "@/features/auth/hooks/useCurrentUser";

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
  {
    id: "wallet-2",
    name: "Savings",
    balance: 10000,
    isDefault: false,
    color: "#8B7CF6",
    isSaving: true,
    savingGoal: 50000,
    icon: PiggyBank,
    type: "savings",
  },
];

const testCategories: Category[] = [
  { id: "cat-food", name: "Food & Drinks", type: "expense", color: "#FF5733", icon: Tag },
  { id: "cat-transport", name: "Transportation", type: "expense", color: "#33FF57", icon: Tag },
  { id: "cat-salary", name: "Salary", type: "income", color: "#3357FF", icon: Tag },
];

function getTestTransactions(): Transaction[] {
  const currentKey = currentMonthKey();
  const { year, month } = parseMonthKey(currentKey);

  return [
    {
      id: "tx-1",
      walletId: "wallet-1",
      categoryId: "cat-food",
      type: "expense",
      amount: 150,
      date: new Date(year, month - 1, 5, 12, 0),
      title: "Lunch Noodles",
      note: "With colleagues",
    },
    {
      id: "tx-2",
      walletId: "wallet-1",
      categoryId: "cat-salary",
      type: "income",
      amount: 30000,
      date: new Date(year, month - 1, 1, 9, 0),
      title: "Monthly Salary",
    },
    {
      id: "tx-3",
      walletId: "wallet-2",
      categoryId: "cat-transport",
      type: "expense",
      amount: 500,
      date: new Date(year, month - 1, 10, 15, 0),
      title: "Train Ticket",
    },
    {
      id: "tx-past",
      walletId: "wallet-1",
      categoryId: "cat-food",
      type: "expense",
      amount: 200,
      date: new Date(year, month - 2, 15, 12, 0), // Previous month
      title: "Previous Month Dinner",
    },
  ];
}

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

describe("HomePage — Task 55: Home Transaction Table", () => {
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
    vi.spyOn(transactionsService, "getTransactions").mockResolvedValue(getTestTransactions());
    vi.spyOn(homeService, "getHomeSummary").mockResolvedValue({
      month: currentMonthKey(),
      walletId: "all",
      balance: { totalBalance: 15000, hasWallets: true, savingGoal: null },
      income: 30000,
      expense: 650,
      net: { net: 29350, status: "surplus" },
      topCategories: [],
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("View — Transaction Table Display & Month/Wallet Scoping", () => {
    it("renders the transaction table with current month items, excluding previous month items", async () => {
      const currentKey = currentMonthKey();
      const currentLabel = monthKeyLabel(currentKey);

      renderWithClient(<HomePage />);

      // Section header and count
      expect(await screen.findByRole("heading", { name: `Transactions · ${currentLabel}` })).toBeInTheDocument();
      expect(await screen.findByText(/3 transactions/i)).toBeInTheDocument();

      // Transactions belonging to the current month are displayed (found in both mobile and desktop views)
      expect(await screen.findAllByText("Lunch Noodles")).toHaveLength(2);
      expect(screen.getAllByText("Monthly Salary")).toHaveLength(2);
      expect(screen.getAllByText("Train Ticket")).toHaveLength(2);

      // Transaction from the previous month is excluded
      expect(screen.queryByText("Previous Month Dinner")).not.toBeInTheDocument();
    });

    it("displays correct amounts, badges and category info for transactions", async () => {
      renderWithClient(<HomePage />);

      expect(await screen.findAllByText("Lunch Noodles")).toHaveLength(2);

      // Expense amounts formatted with minus sign, Income with plus sign
      expect(screen.getAllByText("-฿150").length).toBeGreaterThan(0);
      expect(screen.getAllByText("+฿30,000").length).toBeGreaterThan(0);

      // Category and Wallet badges are rendered
      expect(screen.getAllByText("Food & Drinks").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Salary").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Main Cash").length).toBeGreaterThan(0);
    });

    it("filters displayed transactions when scoped to a specific wallet", async () => {
      useActiveWallet.setState({ activeWalletId: "wallet-2" });
      renderWithClient(<HomePage />);

      expect(await screen.findAllByText("Train Ticket")).toHaveLength(2);
      expect(screen.getByText(/1 transaction/i)).toBeInTheDocument();

      // wallet-1 transactions are filtered out
      expect(screen.queryByText("Lunch Noodles")).not.toBeInTheDocument();
      expect(screen.queryByText("Monthly Salary")).not.toBeInTheDocument();
    });
  });

  describe("Empty-month state", () => {
    it("renders empty-month state when there are no transactions in the selected month", async () => {
      vi.spyOn(transactionsService, "getTransactions").mockResolvedValue([]);
      const currentKey = currentMonthKey();
      const currentLabel = monthKeyLabel(currentKey);

      renderWithClient(<HomePage />);

      expect(await screen.findByText("No transactions this month yet")).toBeInTheDocument();
      expect(
        screen.getByText(`Nothing recorded in All wallets for ${currentLabel}.`)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add a transaction" })).toBeInTheDocument();
    });

    it("clicking 'Add a transaction' in the empty state opens the transaction modal", async () => {
      vi.spyOn(transactionsService, "getTransactions").mockResolvedValue([]);
      renderWithClient(<HomePage />);

      const addBtn = await screen.findByRole("button", { name: "Add a transaction" });
      fireEvent.click(addBtn);

      expect(useTransactionModal.getState().isOpen).toBe(true);
    });
  });

  describe("Edit Transaction Flow", () => {
    it("opens AddTransactionModal in edit mode when clicking Edit from the table row action menu", async () => {
      renderWithClient(<HomePage />);

      expect(await screen.findAllByText("Train Ticket")).toHaveLength(2);

      // Click the actions menu button on the first row (Train Ticket, newest date)
      const actionButtons = screen.getAllByRole("button", { name: "Transaction actions" });
      fireEvent.click(actionButtons[0]);

      // Click "Edit" item from dropdown menu
      const editMenuItem = await screen.findByRole("menuitem", { name: /Edit/i });
      fireEvent.click(editMenuItem);

      // Verify the edit modal is opened with the target transaction
      expect(useTransactionModal.getState().isOpen).toBe(true);
      expect(useTransactionModal.getState().editingTransaction).toMatchObject({
        id: "tx-3",
        title: "Train Ticket",
      });

      // AddTransactionModal displays the edit modal title and pre-filled title
      expect(await screen.findByText("Edit expense")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Train Ticket")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    });
  });

  describe("Delete Transaction Flow", () => {
    it("opens DeleteTransactionDialog and calls deleteTransaction on confirm", async () => {
      const deleteSpy = vi.spyOn(transactionsService, "deleteTransaction").mockResolvedValue(undefined);

      renderWithClient(<HomePage />);

      expect(await screen.findAllByText("Train Ticket")).toHaveLength(2);

      // Click the actions menu button on the first row (Train Ticket, newest date)
      const actionButtons = screen.getAllByRole("button", { name: "Transaction actions" });
      fireEvent.click(actionButtons[0]);

      // Click "Delete" item from dropdown menu
      const deleteMenuItem = await screen.findByRole("menuitem", { name: /Delete/i });
      fireEvent.click(deleteMenuItem);

      // Confirm dialog opens with transaction title
      expect(await screen.findByRole("heading", { name: "Delete transaction?" })).toBeInTheDocument();
      expect(
        screen.getByText('This will permanently delete "Train Ticket". This action cannot be undone.')
      ).toBeInTheDocument();

      // Click confirm Delete in dialog
      const dialog = screen.getByRole("alertdialog");
      const confirmDeleteBtn = within(dialog).getByRole("button", { name: "Delete" });
      fireEvent.click(confirmDeleteBtn);

      // Verify delete mutation was called with the transaction ID
      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith("tx-3");
      });
      expect(toast.success).toHaveBeenCalledWith("Transaction deleted");
    });
  });
});
