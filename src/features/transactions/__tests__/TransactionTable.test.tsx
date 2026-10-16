// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { PiggyBank, Tag, Wallet as WalletIcon } from "lucide-react";

import { TransactionTable } from "../components/TransactionTable";
import * as categoriesService from "@/features/categories/categoriesService";
import * as walletsService from "@/features/wallets/walletsService";
import type { Category } from "@/types/category";
import type { Transaction } from "@/types/transaction";
import type { Wallet } from "@/types/wallet";

const testWallets: Wallet[] = [
  {
    id: "w1",
    name: "Cash",
    balance: 2000,
    isDefault: true,
    color: "#4A4757",
    isSaving: false,
    icon: WalletIcon,
    type: "cash",
  },
  {
    id: "w2",
    name: "Savings",
    balance: 10000,
    isDefault: false,
    color: "#8B7CF6",
    isSaving: true,
    icon: PiggyBank,
    type: "savings",
  },
];

const testCategories: Category[] = [
  { id: "c1", name: "Food", type: "expense", color: "#FF5733", icon: Tag },
  { id: "c2", name: "Salary", type: "income", color: "#3357FF", icon: Tag },
];

const testTransactions: Transaction[] = [
  {
    id: "t1",
    walletId: "w1",
    categoryId: "c1",
    type: "expense",
    amount: 120,
    date: new Date("2026-10-05T12:00:00Z"),
    title: "Lunch Noodles",
    note: "Quick lunch",
  },
  {
    id: "t2",
    walletId: "w2",
    categoryId: "c2",
    type: "income",
    amount: 25000,
    date: new Date("2026-10-01T09:00:00Z"),
    title: "October Salary",
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

describe("TransactionTable Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(walletsService, "getWallets").mockResolvedValue(testWallets);
    vi.spyOn(categoriesService, "getCategories").mockResolvedValue(testCategories);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders transactions with title, formatted amounts, and badges", async () => {
    renderWithClient(
      <TransactionTable
        transactions={testTransactions}
        onDeleteRequest={vi.fn()}
      />
    );

    expect(await screen.findAllByText("Lunch Noodles")).toHaveLength(2);
    expect(screen.getAllByText("October Salary")).toHaveLength(2);

    expect(screen.getAllByText("-฿120").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+฿25,000").length).toBeGreaterThan(0);

    expect(screen.getAllByText("Food").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Salary").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cash").length).toBeGreaterThan(0);
  });

  it("triggers onEdit callback when Edit menu item is clicked", async () => {
    const handleEdit = vi.fn();
    renderWithClient(
      <TransactionTable
        transactions={testTransactions}
        onEdit={handleEdit}
        onDeleteRequest={vi.fn()}
      />
    );

    expect(await screen.findAllByText("Lunch Noodles")).toHaveLength(2);

    const actionButtons = screen.getAllByRole("button", { name: "Transaction actions" });
    fireEvent.click(actionButtons[0]);

    const editMenuItem = await screen.findByRole("menuitem", { name: /Edit/i });
    fireEvent.click(editMenuItem);

    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith(testTransactions[0]);
  });

  it("triggers onDeleteRequest callback when Delete menu item is clicked", async () => {
    const handleDeleteRequest = vi.fn();
    renderWithClient(
      <TransactionTable
        transactions={testTransactions}
        onDeleteRequest={handleDeleteRequest}
      />
    );

    expect(await screen.findAllByText("Lunch Noodles")).toHaveLength(2);

    const actionButtons = screen.getAllByRole("button", { name: "Transaction actions" });
    fireEvent.click(actionButtons[0]);

    const deleteMenuItem = await screen.findByRole("menuitem", { name: /Delete/i });
    fireEvent.click(deleteMenuItem);

    expect(handleDeleteRequest).toHaveBeenCalledTimes(1);
    expect(handleDeleteRequest).toHaveBeenCalledWith(testTransactions[0]);
  });

  it("renders empty state when transaction array is empty", () => {
    renderWithClient(
      <TransactionTable
        transactions={[]}
        onDeleteRequest={vi.fn()}
      />
    );

    expect(screen.getByText("No transactions found")).toBeInTheDocument();
    expect(screen.getByText("Try adjusting your search or filters.")).toBeInTheDocument();
  });

  it("toggles note expansion when clicking on a note", async () => {
    renderWithClient(
      <TransactionTable
        transactions={testTransactions}
        onDeleteRequest={vi.fn()}
      />
    );

    const noteButton = await screen.findByRole("button", { name: /Quick lunch/i });
    expect(noteButton).toBeInTheDocument();

    fireEvent.click(noteButton);
    // Row background toggles expanded state
    expect(noteButton.querySelector("span")).toHaveClass("whitespace-pre-wrap");
  });
});
