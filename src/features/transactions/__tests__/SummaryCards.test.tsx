// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { Tag, Wallet as WalletIcon } from "lucide-react";

import TransactionsPage from "../components/TransactionsPage";
import { SummaryCards } from "../components/SummaryCards";
import { useTransactionFilters } from "../store/useTransactionFilters";
import { useTransactionModal } from "../store/useTransactionModal";
import * as transactionsService from "../transactionsService";
import * as categoriesService from "@/features/categories/categoriesService";
import * as walletsService from "@/features/wallets/walletsService";
import { currentPeriod } from "../period";
import type { Category } from "@/types/category";
import type { Transaction } from "@/types/transaction";
import type { Wallet } from "@/types/wallet";

const testWallets: Wallet[] = [
  {
    id: "w1",
    name: "Main Wallet",
    balance: 5000,
    isDefault: true,
    color: "#4A4757",
    isSaving: false,
    icon: WalletIcon,
    type: "cash",
  },
  {
    id: "w2",
    name: "Savings Wallet",
    balance: 10000,
    isDefault: false,
    color: "#8B7CF6",
    isSaving: true,
    savingGoal: 50000,
    icon: WalletIcon,
    type: "savings",
  },
];

const testCategories: Category[] = [
  { id: "c1", name: "Food", type: "expense", color: "#FF5733", icon: Tag },
  { id: "c2", name: "Transport", type: "expense", color: "#33FF57", icon: Tag },
  { id: "c3", name: "Salary", type: "income", color: "#3357FF", icon: Tag },
];

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();

const testTransactions: Transaction[] = [
  {
    id: "t1",
    walletId: "w1",
    categoryId: "c1",
    type: "expense",
    amount: 300,
    date: new Date(year, month, 5, 12, 0),
    title: "Lunch Noodles",
    note: "Lunch with friends",
  },
  {
    id: "t2",
    walletId: "w1",
    categoryId: "c2",
    type: "expense",
    amount: 150,
    date: new Date(year, month, 6, 8, 30),
    title: "Train Ticket",
  },
  {
    id: "t3",
    walletId: "w2",
    categoryId: "c3",
    type: "income",
    amount: 10000,
    date: new Date(year, month, 1, 9, 0),
    title: "Monthly Salary",
  },
];

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  queryClient.setQueryData(["wallets"], testWallets);
  queryClient.setQueryData(["categories"], testCategories);

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function getCards() {
  const cards = document.querySelectorAll('[data-slot="card"]');
  return {
    spent: cards[0] as HTMLElement,
    income: cards[1] as HTMLElement,
    net: cards[2] as HTMLElement,
  };
}

describe("Task 66 — Summary Cards Recalculation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTransactionFilters.getState().resetFilters();
    useTransactionModal.setState({
      isOpen: false,
      defaultType: "expense",
      editingTransaction: null,
      deletingTransaction: null,
    });

    vi.spyOn(walletsService, "getWallets").mockResolvedValue(testWallets);
    vi.spyOn(categoriesService, "getCategories").mockResolvedValue(testCategories);
    vi.spyOn(transactionsService, "getTransactions").mockResolvedValue(testTransactions);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("SummaryCards component in isolation", () => {
    it("computes and displays correct totals for full transaction list", () => {
      render(
        <SummaryCards
          transactions={testTransactions}
          period={currentPeriod()}
        />
      );

      const cards = getCards();
      // Total expense: t1 (300) + t2 (150) = 450
      expect(within(cards.spent).getByText("฿450")).toBeInTheDocument();
      // Total income: t3 (10000)
      expect(within(cards.income).getByText("฿10,000")).toBeInTheDocument();
      // Net: 10000 - 450 = +9550
      expect(within(cards.net).getByText("+฿9,550")).toBeInTheDocument();
      expect(within(cards.net).getByText("Surplus")).toBeInTheDocument();
    });

    it("displays empty state when transactions list is empty", () => {
      render(
        <SummaryCards
          transactions={[]}
          period={currentPeriod()}
        />
      );

      const cards = getCards();
      expect(within(cards.spent).getByText("No spending recorded in this period")).toBeInTheDocument();
      expect(within(cards.income).getByText("No income recorded in this period")).toBeInTheDocument();
      expect(within(cards.spent).getByText("฿0")).toBeInTheDocument();
      expect(within(cards.income).getByText("฿0")).toBeInTheDocument();
      expect(within(cards.net).getByText("฿0")).toBeInTheDocument();
    });
  });

  describe("TransactionsPage — SummaryCards recalculation on filter changes", () => {
    it("renders initial total calculations for all transactions in period", async () => {
      renderWithClient(<TransactionsPage />);

      // Wait for page to render
      expect(await screen.findByRole("heading", { name: "Transactions" })).toBeInTheDocument();

      const cards = getCards();
      expect(await within(cards.spent).findByText("฿450")).toBeInTheDocument();
      expect(within(cards.income).getByText("฿10,000")).toBeInTheDocument();
      expect(within(cards.net).getByText("+฿9,550")).toBeInTheDocument();
    });

    it("recalculates SummaryCards when filtering by transaction type (Expense)", async () => {
      renderWithClient(<TransactionsPage />);

      expect(await screen.findByRole("heading", { name: "Transactions" })).toBeInTheDocument();

      // Filter by Expense: Income becomes 0, Net becomes -450
      act(() => {
        useTransactionFilters.getState().setFilters({
          ...useTransactionFilters.getState().filters,
          type: "expense",
        });
      });

      const cards = getCards();
      expect(within(cards.spent).getByText("฿450")).toBeInTheDocument();
      expect(within(cards.income).getByText("No income recorded in this period")).toBeInTheDocument();
      expect(within(cards.net).getByText("-฿450")).toBeInTheDocument();
      expect(within(cards.net).getByText("Overspending")).toBeInTheDocument();
    });

    it("recalculates SummaryCards when filtering by transaction type (Income)", async () => {
      renderWithClient(<TransactionsPage />);

      expect(await screen.findByRole("heading", { name: "Transactions" })).toBeInTheDocument();

      // Filter by Income: Spent becomes 0, Net becomes +10,000
      act(() => {
        useTransactionFilters.getState().setFilters({
          ...useTransactionFilters.getState().filters,
          type: "income",
        });
      });

      const cards = getCards();
      expect(within(cards.spent).getByText("No spending recorded in this period")).toBeInTheDocument();
      expect(within(cards.income).getByText("฿10,000")).toBeInTheDocument();
      expect(within(cards.net).getByText("+฿10,000")).toBeInTheDocument();
      expect(within(cards.net).getByText("Surplus")).toBeInTheDocument();
    });

    it("recalculates SummaryCards when filtering by specific wallet", async () => {
      renderWithClient(<TransactionsPage />);

      expect(await screen.findByRole("heading", { name: "Transactions" })).toBeInTheDocument();

      // Filter by w1 (Main Wallet): has t1 (300) and t2 (150), no income
      act(() => {
        useTransactionFilters.getState().setFilters({
          ...useTransactionFilters.getState().filters,
          walletId: "w1",
        });
      });

      const cardsW1 = getCards();
      expect(within(cardsW1.spent).getByText("฿450")).toBeInTheDocument();
      expect(within(cardsW1.income).getByText("No income recorded in this period")).toBeInTheDocument();
      expect(within(cardsW1.net).getByText("-฿450")).toBeInTheDocument();

      // Switch to w2 (Savings Wallet): has only t3 (10000 income)
      act(() => {
        useTransactionFilters.getState().setFilters({
          ...useTransactionFilters.getState().filters,
          walletId: "w2",
        });
      });

      const cardsW2 = getCards();
      expect(within(cardsW2.spent).getByText("No spending recorded in this period")).toBeInTheDocument();
      expect(within(cardsW2.income).getByText("฿10,000")).toBeInTheDocument();
      expect(within(cardsW2.net).getByText("+฿10,000")).toBeInTheDocument();
    });

    it("recalculates SummaryCards when filtering by specific category", async () => {
      renderWithClient(<TransactionsPage />);

      expect(await screen.findByRole("heading", { name: "Transactions" })).toBeInTheDocument();

      // Filter by Category c1 (Food): only t1 (300 expense)
      act(() => {
        useTransactionFilters.getState().setFilters({
          ...useTransactionFilters.getState().filters,
          categoryId: "c1",
        });
      });

      const cards = getCards();
      expect(within(cards.spent).getByText("฿300")).toBeInTheDocument();
      expect(within(cards.income).getByText("No income recorded in this period")).toBeInTheDocument();
      expect(within(cards.net).getByText("-฿300")).toBeInTheDocument();
    });

    it("recalculates SummaryCards when searching by keyword", async () => {
      renderWithClient(<TransactionsPage />);

      expect(await screen.findByRole("heading", { name: "Transactions" })).toBeInTheDocument();

      // Search for "Train": only t2 (150 expense) matches
      const searchInputs = screen.getAllByPlaceholderText("Search by title or note");
      act(() => {
        fireEvent.change(searchInputs[0], { target: { value: "Train" } });
      });

      const cards = getCards();
      expect(within(cards.spent).getByText("฿150")).toBeInTheDocument();
      expect(within(cards.income).getByText("No income recorded in this period")).toBeInTheDocument();
      expect(within(cards.net).getByText("-฿150")).toBeInTheDocument();
    });

    it("restores SummaryCards calculations when resetting filters", async () => {
      renderWithClient(<TransactionsPage />);

      expect(await screen.findByRole("heading", { name: "Transactions" })).toBeInTheDocument();

      // Apply filter
      act(() => {
        useTransactionFilters.getState().setFilters({
          ...useTransactionFilters.getState().filters,
          categoryId: "c1",
        });
      });

      const cardsFiltered = getCards();
      expect(within(cardsFiltered.spent).getByText("฿300")).toBeInTheDocument();

      // Reset filters
      act(() => {
        useTransactionFilters.getState().resetFilters();
      });

      const cardsRestored = getCards();
      expect(within(cardsRestored.spent).getByText("฿450")).toBeInTheDocument();
      expect(within(cardsRestored.income).getByText("฿10,000")).toBeInTheDocument();
      expect(within(cardsRestored.net).getByText("+฿9,550")).toBeInTheDocument();
    });
  });
});
