// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import { CURRENT_USER_QUERY_KEY } from "@/features/auth/hooks/useCurrentUser";
import * as categoriesService from "@/features/categories/categoriesService";
import * as walletsService from "@/features/wallets/walletsService";
import {
  OWNED_SHARED_WALLET,
  PERSONAL_WALLET,
  sharedTransactions,
} from "@/test/shared-wallet-fixtures";
import type { Transaction } from "@/types/transaction";
import { AddTransactionModal } from "../components/AddTransactionModal";
import TransactionsPage from "../components/TransactionsPage";
import { TransactionTable } from "../components/TransactionTable";
import { useTransactionFilters } from "../store/useTransactionFilters";
import { useTransactionModal } from "../store/useTransactionModal";
import * as transactionsService from "../transactionsService";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const now = new Date();
const SHARED_ROWS = sharedTransactions(now.getFullYear(), now.getMonth() + 1);
const PERSONAL_ROW: Transaction = {
  id: "tx-personal",
  walletId: PERSONAL_WALLET.id,
  type: "expense",
  amount: 120,
  date: new Date(now.getFullYear(), now.getMonth(), 3, 12),
  title: "Lunch Noodles",
};

function renderWithClient(ui: React.ReactElement) {
  // `staleTime: Infinity` keeps the seeded data instead of refetching it through the services.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(["wallets"], [PERSONAL_WALLET, OWNED_SHARED_WALLET]);
  client.setQueryData(["categories"], []);
  client.setQueryData(CURRENT_USER_QUERY_KEY, { id: "u-me", email: "tul@example.com", name: "Tul" });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  useTransactionModal.setState({ isOpen: false, defaultType: "expense", defaultWalletId: undefined, editingTransaction: null, deletingTransaction: null });
  vi.spyOn(walletsService, "getWallets").mockResolvedValue([PERSONAL_WALLET, OWNED_SHARED_WALLET]);
  vi.spyOn(categoriesService, "getCategories").mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TransactionTable — shared wallet rows", () => {
  it("keeps Category and swaps Wallet for a Logged by column", () => {
    renderWithClient(<TransactionTable transactions={SHARED_ROWS} onDeleteRequest={vi.fn()} />);

    expect(screen.getByRole("columnheader", { name: "Logged by" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Category" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Wallet" })).not.toBeInTheDocument();
  });

  it("shows each row's preset category, with Others for a row saved without one", () => {
    renderWithClient(<TransactionTable transactions={SHARED_ROWS} onDeleteRequest={vi.fn()} />);

    // Each row renders once for mobile and once for desktop.
    expect(screen.getAllByText("Utilities")).toHaveLength(2);
    expect(screen.getAllByText("Others")).toHaveLength(2);
  });

  it("shows who logged each row and who edited it when that is someone else", () => {
    renderWithClient(<TransactionTable transactions={SHARED_ROWS} onDeleteRequest={vi.fn()} />);

    // Each row renders once for mobile and once for desktop.
    expect(screen.getAllByText("Logged by Guy")).toHaveLength(2);
    expect(screen.getAllByText("edited by Tul (you)")).toHaveLength(2);
    expect(screen.getAllByText("Logged by Tul (you)")).toHaveLength(2);
    expect(screen.queryByText(/edited by Guy/)).not.toBeInTheDocument();
  });

  it("lets any member edit or delete any row", () => {
    const onEdit = vi.fn();
    const onDeleteRequest = vi.fn();
    renderWithClient(<TransactionTable transactions={SHARED_ROWS} onEdit={onEdit} onDeleteRequest={onDeleteRequest} />);

    // First desktop row is "Internet", which Guy logged.
    fireEvent.click(screen.getAllByRole("button", { name: "Transaction actions" })[0]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "shared-tx-1", title: "Internet" }));
  });

  it("keeps the Category and Wallet columns for personal rows", () => {
    renderWithClient(<TransactionTable transactions={[PERSONAL_ROW]} onDeleteRequest={vi.fn()} />);

    expect(screen.getByRole("columnheader", { name: "Category" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Wallet" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Logged by" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Logged by/)).not.toBeInTheDocument();
  });
});

describe("AddTransactionModal — shared wallet", () => {
  function openFor(walletId: string | undefined) {
    useTransactionModal.setState({ isOpen: true, defaultType: "expense", defaultWalletId: walletId, editingTransaction: null });
  }

  it("offers the fixed preset categories, preselects Others and says who will be logged", async () => {
    openFor(OWNED_SHARED_WALLET.id);
    renderWithClient(<AddTransactionModal onAdd={vi.fn()} />);

    expect(await screen.findByRole("radiogroup", { name: "Category" })).toBeInTheDocument();
    expect(await screen.findByRole("radio", { name: "Food & Drinks" })).toHaveAttribute("aria-checked", "false");
    await waitFor(() => expect(screen.getByRole("radio", { name: "Others" })).toHaveAttribute("aria-checked", "true"));
    expect(screen.queryByRole("radio", { name: "Salary" })).not.toBeInTheDocument();
    expect(await screen.findByText("Will be logged by Tul")).toBeInTheDocument();
  });

  it("switches to the income presets when the type changes", async () => {
    openFor(OWNED_SHARED_WALLET.id);
    renderWithClient(<AddTransactionModal onAdd={vi.fn()} />);

    fireEvent.click(await screen.findByRole("radio", { name: "Income" }));
    expect(await screen.findByRole("radio", { name: "Salary" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Food & Drinks" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("radio", { name: "Others" })).toHaveAttribute("aria-checked", "true"));
  });

  it("saves the chosen preset as categoryKey, never a categoryId", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    openFor(OWNED_SHARED_WALLET.id);
    renderWithClient(<AddTransactionModal onAdd={onAdd} />);

    fireEvent.change(await screen.findByLabelText("Title"), { target: { value: "Noodles" } });
    fireEvent.change(screen.getByLabelText("Money out"), { target: { value: "90" } });
    fireEvent.click(await screen.findByRole("radio", { name: "Food & Drinks" }));
    fireEvent.click(screen.getByRole("button", { name: "Save expense" }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ walletId: OWNED_SHARED_WALLET.id, categoryKey: "food-drinks", categoryId: undefined })
    );
  });

  it("saves Others by default", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    openFor(OWNED_SHARED_WALLET.id);
    renderWithClient(<AddTransactionModal onAdd={onAdd} />);

    fireEvent.change(await screen.findByLabelText("Title"), { target: { value: "Groceries" } });
    fireEvent.change(screen.getByLabelText("Money out"), { target: { value: "350" } });
    fireEvent.click(screen.getByRole("button", { name: "Save expense" }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ walletId: OWNED_SHARED_WALLET.id, title: "Groceries", amount: 350, categoryId: undefined, categoryKey: "others-expense" })
    );
  });

  it("keeps the personal category chips and offers shared wallets with a Shared tag", async () => {
    openFor(PERSONAL_WALLET.id);
    renderWithClient(<AddTransactionModal onAdd={vi.fn()} />);

    expect(await screen.findByRole("radiogroup", { name: "Category" })).toBeInTheDocument();
    // This user has no categories of their own in the test, and the presets are not offered for a personal wallet.
    expect(screen.queryByRole("radio", { name: "Food & Drinks" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Will be logged by/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Pay from wallet"));
    const option = await screen.findByRole("option", { name: /Housemate Fund/ });
    expect(option).toHaveTextContent("Shared");

    // Choosing the shared wallet swaps in the fixed presets.
    await userEvent.click(option);
    expect(await screen.findByRole("radio", { name: "Food & Drinks" })).toBeInTheDocument();
    expect(screen.getByText(/Will be logged by/)).toBeInTheDocument();
  });

  it("shows who logged an existing shared row when editing it", async () => {
    useTransactionModal.setState({ isOpen: true, defaultType: "expense", editingTransaction: SHARED_ROWS[0] });
    renderWithClient(<AddTransactionModal onEdit={vi.fn()} />);

    expect(await screen.findByText("Logged by Guy")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    // The row's own preset is the selected chip.
    await waitFor(() => expect(screen.getByRole("radio", { name: "Utilities" })).toHaveAttribute("aria-checked", "true"));
  });
});

describe("Transactions page — shared wallets stay on Home", () => {
  beforeEach(() => {
    useTransactionFilters.getState().resetFilters();
    vi.spyOn(transactionsService, "getTransactions").mockResolvedValue([
      PERSONAL_ROW,
      // A row logged by the user into a shared wallet must not show up here either.
      { ...SHARED_ROWS[1], date: new Date(now.getFullYear(), now.getMonth(), 4, 12) },
    ]);
    vi.spyOn(transactionsService, "getTransactionSummary").mockResolvedValue({
      totalIncome: 0,
      totalExpense: 120,
      netBalance: -120,
    });
  });

  it("lists personal rows only", async () => {
    renderWithClient(<TransactionsPage />);

    expect((await screen.findAllByText("Lunch Noodles")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Rent share")).not.toBeInTheDocument();
    expect(screen.getByText("1 transaction")).toBeInTheDocument();
  });

  it("ignores a shared wallet left in the wallet filter by Home", async () => {
    const { filters, setFilters } = useTransactionFilters.getState();
    setFilters({ ...filters, walletId: OWNED_SHARED_WALLET.id });

    renderWithClient(<TransactionsPage />);

    expect((await screen.findAllByText("Lunch Noodles")).length).toBeGreaterThan(0);
    expect(screen.getByText("1 transaction")).toBeInTheDocument();
  });
});
