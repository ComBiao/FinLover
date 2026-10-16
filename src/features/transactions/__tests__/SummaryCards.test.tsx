// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
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
import type { TransactionSummary } from "../transactions";

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

const defaultSummary: TransactionSummary = {
  totalIncome: 10000,
  totalExpense: 450,
  netBalance: 9550,
};

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
    vi.spyOn(transactionsService, "getTransactionSummary").mockImplementation(async (query) => {
      if (query.walletId === "empty-wallet" || query.categoryId === "empty-cat") {
        return { totalIncome: 0, totalExpense: 0, netBalance: 0 };
      }
      if (query.walletId === "w1") {
        return { totalIncome: 0, totalExpense: 450, netBalance: -450 };
      }
      if (query.walletId === "w2") {
        return { totalIncome: 10000, totalExpense: 0, netBalance: 10000 };
      }
      if (query.categoryId === "c1") {
        return { totalIncome: 0, totalExpense: 300, netBalance: -300 };
      }
      if (query.type === "expense") {
        return { totalIncome: 0, totalExpense: 450, netBalance: -450 };
      }
      if (query.type === "income") {
        return { totalIncome: 10000, totalExpense: 0, netBalance: 10000 };
      }
      return defaultSummary;
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("SummaryCards component in isolation", () => {
    it("renders summary figures when summary is provided", () => {
      render(
        <SummaryCards
          summary={{ totalIncome: 10000, totalExpense: 450, netBalance: 9550 }}
          period={currentPeriod()}
        />
      );

      const cards = getCards();
      expect(within(cards.spent).getByText("฿450")).toBeInTheDocument();
      expect(within(cards.income).getByText("฿10,000")).toBeInTheDocument();
      expect(within(cards.net).getByText("+฿9,550")).toBeInTheDocument();
      expect(within(cards.net).getByText("Surplus")).toBeInTheDocument();
    });

    it("renders zero amounts and empty state messages when summary is empty", () => {
      render(
        <SummaryCards
          summary={{ totalIncome: 0, totalExpense: 0, netBalance: 0 }}
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

    it("renders negative net balance with Overspending status", () => {
      render(
        <SummaryCards
          summary={{ totalIncome: 0, totalExpense: 450, netBalance: -450 }}
          period={currentPeriod()}
        />
      );

      const cards = getCards();
      expect(within(cards.spent).getByText("฿450")).toBeInTheDocument();
      expect(within(cards.net).getByText("-฿450")).toBeInTheDocument();
      expect(within(cards.net).getByText("Overspending")).toBeInTheDocument();
    });
  });

  describe("TransactionsPage — SummaryCards recalculation on filter changes", () => {
    it("renders initial total calculations from server summary", async () => {
      renderWithClient(<TransactionsPage />);

      expect(await screen.findByRole("heading", { name: "Transactions" })).toBeInTheDocument();

      const cards = getCards();
      await waitFor(() => {
        expect(within(cards.spent).getByText("฿450")).toBeInTheDocument();
        expect(within(cards.income).getByText("฿10,000")).toBeInTheDocument();
        expect(within(cards.net).getByText("+฿9,550")).toBeInTheDocument();
      });
    });

    it("recalculates SummaryCards when filtering by transaction type (Expense)", async () => {
      renderWithClient(<TransactionsPage />);

      expect(await screen.findByRole("heading", { name: "Transactions" })).toBeInTheDocument();

      act(() => {
        useTransactionFilters.getState().setFilters({
          ...useTransactionFilters.getState().filters,
          type: "expense",
        });
      });

      const cards = getCards();
      await waitFor(() => {
        expect(within(cards.spent).getByText("฿450")).toBeInTheDocument();
        expect(within(cards.income).getByText("No income recorded in this period")).toBeInTheDocument();
        expect(within(cards.net).getByText("-฿450")).toBeInTheDocument();
        expect(within(cards.net).getByText("Overspending")).toBeInTheDocument();
      });
    });

    it("recalculates SummaryCards when filtering by transaction type (Income)", async () => {
      renderWithClient(<TransactionsPage />);

      expect(await screen.findByRole("heading", { name: "Transactions" })).toBeInTheDocument();

      act(() => {
        useTransactionFilters.getState().setFilters({
          ...useTransactionFilters.getState().filters,
          type: "income",
        });
      });

      const cards = getCards();
      await waitFor(() => {
        expect(within(cards.spent).getByText("No spending recorded in this period")).toBeInTheDocument();
        expect(within(cards.income).getByText("฿10,000")).toBeInTheDocument();
        expect(within(cards.net).getByText("+฿10,000")).toBeInTheDocument();
        expect(within(cards.net).getByText("Surplus")).toBeInTheDocument();
      });
    });

    it("recalculates SummaryCards when filtering by specific wallet", async () => {
      renderWithClient(<TransactionsPage />);

      expect(await screen.findByRole("heading", { name: "Transactions" })).toBeInTheDocument();

      act(() => {
        useTransactionFilters.getState().setFilters({
          ...useTransactionFilters.getState().filters,
          walletId: "w1",
        });
      });

      const cards = getCards();
      await waitFor(() => {
        expect(within(cards.spent).getByText("฿450")).toBeInTheDocument();
        expect(within(cards.income).getByText("No income recorded in this period")).toBeInTheDocument();
        expect(within(cards.net).getByText("-฿450")).toBeInTheDocument();
      });

      act(() => {
        useTransactionFilters.getState().setFilters({
          ...useTransactionFilters.getState().filters,
          walletId: "w2",
        });
      });

      await waitFor(() => {
        expect(within(cards.spent).getByText("No spending recorded in this period")).toBeInTheDocument();
        expect(within(cards.income).getByText("฿10,000")).toBeInTheDocument();
        expect(within(cards.net).getByText("+฿10,000")).toBeInTheDocument();
      });
    });

    it("recalculates SummaryCards when filtering by specific category", async () => {
      renderWithClient(<TransactionsPage />);

      expect(await screen.findByRole("heading", { name: "Transactions" })).toBeInTheDocument();

      act(() => {
        useTransactionFilters.getState().setFilters({
          ...useTransactionFilters.getState().filters,
          categoryId: "c1",
        });
      });

      const cards = getCards();
      await waitFor(() => {
        expect(within(cards.spent).getByText("฿300")).toBeInTheDocument();
        expect(within(cards.income).getByText("No income recorded in this period")).toBeInTheDocument();
        expect(within(cards.net).getByText("-฿300")).toBeInTheDocument();
      });
    });

    it("displays ฿0 across all three cards when filter matches nothing", async () => {
      renderWithClient(<TransactionsPage />);

      expect(await screen.findByRole("heading", { name: "Transactions" })).toBeInTheDocument();

      act(() => {
        useTransactionFilters.getState().setFilters({
          ...useTransactionFilters.getState().filters,
          walletId: "empty-wallet",
        });
      });

      const cards = getCards();
      await waitFor(() => {
        expect(within(cards.spent).getByText("No spending recorded in this period")).toBeInTheDocument();
        expect(within(cards.income).getByText("No income recorded in this period")).toBeInTheDocument();
        expect(within(cards.spent).getByText("฿0")).toBeInTheDocument();
        expect(within(cards.income).getByText("฿0")).toBeInTheDocument();
        expect(within(cards.net).getByText("฿0")).toBeInTheDocument();
      });
    });

    it("restores SummaryCards calculations when resetting filters", async () => {
      renderWithClient(<TransactionsPage />);

      expect(await screen.findByRole("heading", { name: "Transactions" })).toBeInTheDocument();

      act(() => {
        useTransactionFilters.getState().setFilters({
          ...useTransactionFilters.getState().filters,
          categoryId: "c1",
        });
      });

      const cards = getCards();
      await waitFor(() => {
        expect(within(cards.spent).getByText("฿300")).toBeInTheDocument();
      });

      act(() => {
        useTransactionFilters.getState().resetFilters();
      });

      await waitFor(() => {
        expect(within(cards.spent).getByText("฿450")).toBeInTheDocument();
        expect(within(cards.income).getByText("฿10,000")).toBeInTheDocument();
        expect(within(cards.net).getByText("+฿9,550")).toBeInTheDocument();
      });
    });
  });
});
