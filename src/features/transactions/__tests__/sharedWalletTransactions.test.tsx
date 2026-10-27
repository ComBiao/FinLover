// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

    // Each row renders twice. The mobile card has a "Logged by" caption above the name; the desktop table's column header already says it, so its cell is just the name.
    const cards = within(screen.getByRole("list", { name: "Transactions" }));
    expect(cards.getAllByText("Logged by")).toHaveLength(2);
    expect(cards.getAllByText("Guy")).toHaveLength(1);
    expect(cards.getAllByText("Tul (you)")).toHaveLength(1);
    const table = within(screen.getByRole("table"));
    expect(table.getAllByText("Guy")).toHaveLength(1);
    expect(table.getAllByText("Tul (you)")).toHaveLength(1);
    expect(screen.getAllByText("edited by Tul (you)")).toHaveLength(2);
    expect(screen.queryByText(/edited by Guy/)).not.toBeInTheDocument();
  });

  it("offers no chevron when the names fit", () => {
    renderWithClient(<TransactionTable transactions={SHARED_ROWS} onDeleteRequest={vi.fn()} />);

    // jsdom has no layout, so nothing overflows.
    expect(screen.queryByRole("button", { name: "Show full names" })).not.toBeInTheDocument();
  });

  describe("when a name is cut off", () => {
    beforeEach(() => {
      // Pretend every text node is wider than its box.
      vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(300);
      vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
    });

    it("expands the names in full from the chevron, and collapses them again", () => {
      renderWithClient(<TransactionTable transactions={SHARED_ROWS} onDeleteRequest={vi.fn()} />);

      // Only the desktop table's name cells offer the chevron.
      const table = within(screen.getByRole("table"));
      const chevrons = screen.getAllByRole("button", { name: "Show full names" });
      expect(chevrons).toHaveLength(2);
      expect(table.getByText("Guy")).toHaveClass("truncate");

      fireEvent.click(chevrons[0]);

      expect(screen.getByRole("button", { name: "Collapse names" })).toHaveAttribute("aria-expanded", "true");
      expect(table.getByText("Guy")).not.toHaveClass("truncate");

      fireEvent.click(screen.getByRole("button", { name: "Collapse names" }));
      expect(table.getByText("Guy")).toHaveClass("truncate");
    });
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

describe("AddTransactionModal — wallet when editing", () => {
  it("locks the wallet of a shared row but still shows it", async () => {
    useTransactionModal.setState({ isOpen: true, defaultType: "expense", editingTransaction: SHARED_ROWS[0] });
    renderWithClient(<AddTransactionModal onEdit={vi.fn()} />);

    const trigger = await screen.findByLabelText("Pay from wallet");
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveTextContent("Housemate Fund");
  });

  it("offers only personal wallets when editing a personal row", async () => {
    useTransactionModal.setState({ isOpen: true, defaultType: "expense", editingTransaction: PERSONAL_ROW });
    renderWithClient(<AddTransactionModal onEdit={vi.fn()} />);

    const trigger = await screen.findByLabelText("Pay from wallet");
    expect(trigger).toBeEnabled();
    await userEvent.click(trigger);
    expect(await screen.findByRole("option", { name: /Main Cash/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Housemate Fund/ })).not.toBeInTheDocument();
  });
});

describe("Transactions page — wallet filter", () => {
  beforeEach(() => {
    useTransactionFilters.getState().resetFilters();
    vi.spyOn(transactionsService, "getTransactions").mockResolvedValue([
      PERSONAL_ROW,
      // A row logged by the user into a shared wallet must not show up under "All wallets" either.
      { ...SHARED_ROWS[1], date: new Date(now.getFullYear(), now.getMonth(), 4, 12) },
    ]);
    vi.spyOn(transactionsService, "getSharedWalletTransactions").mockResolvedValue(SHARED_ROWS);
    vi.spyOn(transactionsService, "getTransactionSummary").mockResolvedValue({
      totalIncome: 0,
      totalExpense: 120,
      netBalance: -120,
    });
  });

  function filterWallet(walletId: string | undefined) {
    const { filters, setFilters } = useTransactionFilters.getState();
    setFilters({ ...filters, walletId });
  }

  it("lists personal rows only under All wallets", async () => {
    renderWithClient(<TransactionsPage />);

    expect((await screen.findAllByText("Lunch Noodles")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Rent share")).not.toBeInTheDocument();
    expect(screen.getByText("1 transaction")).toBeInTheDocument();
    expect(transactionsService.getSharedWalletTransactions).not.toHaveBeenCalled();
  });

  it("opens on the shared wallet picked on Home, with its rows from every member", async () => {
    filterWallet(OWNED_SHARED_WALLET.id);
    renderWithClient(<TransactionsPage />);

    expect((await screen.findAllByText("Internet")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rent share").length).toBeGreaterThan(0);
    expect(screen.queryByText("Lunch Noodles")).not.toBeInTheDocument();
    expect(screen.getByText("2 transactions")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Logged by" })).toBeInTheDocument();
    expect(transactionsService.getSharedWalletTransactions).toHaveBeenCalledWith(
      OWNED_SHARED_WALLET.id,
      expect.stringMatching(/^\d{4}-\d{2}$/)
    );
  });

  it("totals the shared wallet's rows in the summary cards instead of asking the server", async () => {
    filterWallet(OWNED_SHARED_WALLET.id);
    renderWithClient(<TransactionsPage />);

    await screen.findAllByText("Internet");
    // Internet -599 (expense), Rent share +6,000 (income).
    expect(await screen.findByText("฿599")).toBeInTheDocument();
    expect(screen.getAllByText("฿6,000").length).toBeGreaterThan(0);
    expect(screen.getByText("+฿5,401")).toBeInTheDocument();
    expect(transactionsService.getTransactionSummary).not.toHaveBeenCalledWith(
      expect.objectContaining({ walletId: OWNED_SHARED_WALLET.id })
    );
  });

  it("filters a shared wallet by preset category", async () => {
    filterWallet(OWNED_SHARED_WALLET.id);
    const { filters, setFilters } = useTransactionFilters.getState();
    setFilters({ ...filters, walletId: OWNED_SHARED_WALLET.id, categoryKey: "utilities" });
    renderWithClient(<TransactionsPage />);

    expect((await screen.findAllByText("Internet")).length).toBeGreaterThan(0);
    // "Rent share" has no stored category, so it counts as Others and drops out.
    expect(screen.queryByText("Rent share")).not.toBeInTheDocument();
    expect(screen.getByText("1 transaction")).toBeInTheDocument();
  });

  it("ignores a personal category left over while a shared wallet is filtered", async () => {
    const { filters, setFilters } = useTransactionFilters.getState();
    setFilters({ ...filters, walletId: OWNED_SHARED_WALLET.id, categoryId: "c-personal" });
    renderWithClient(<TransactionsPage />);

    expect(await screen.findByText("2 transactions")).toBeInTheDocument();
  });

  it("drops the category when switching from a personal to a shared wallet", async () => {
    const { filters, setFilters } = useTransactionFilters.getState();
    setFilters({ ...filters, walletId: PERSONAL_WALLET.id, categoryId: "c-personal" });
    renderWithClient(<TransactionsPage />);

    await screen.findByRole("heading", { name: "Transactions" });
    const walletTrigger = (await screen.findAllByRole("combobox")).find((element) => element.textContent?.includes(PERSONAL_WALLET.name));
    await userEvent.click(walletTrigger!);
    await userEvent.click(await screen.findByRole("option", { name: /Housemate Fund/ }));

    await waitFor(() => expect(useTransactionFilters.getState().filters.walletId).toBe(OWNED_SHARED_WALLET.id));
    expect(useTransactionFilters.getState().filters.categoryId).toBeUndefined();
    expect(useTransactionFilters.getState().filters.categoryKey).toBeUndefined();
  });

  it("falls back to All wallets when the filtered wallet no longer exists", async () => {
    filterWallet("wallet-that-was-deleted");
    renderWithClient(<TransactionsPage />);

    expect((await screen.findAllByText("Lunch Noodles")).length).toBeGreaterThan(0);
    expect(screen.getByText("1 transaction")).toBeInTheDocument();
    expect(transactionsService.getSharedWalletTransactions).not.toHaveBeenCalled();
  });

  it("starts a new transaction in the shared wallet being viewed", async () => {
    filterWallet(OWNED_SHARED_WALLET.id);
    renderWithClient(<TransactionsPage />);

    await screen.findAllByText("Internet");
    fireEvent.click(screen.getByRole("button", { name: "Add Transaction" }));

    expect(useTransactionModal.getState().defaultWalletId).toBe(OWNED_SHARED_WALLET.id);
  });
});
