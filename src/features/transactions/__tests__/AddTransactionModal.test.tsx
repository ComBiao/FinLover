// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender, fireEvent, screen, waitFor, within, cleanup } from "@testing-library/react";
import type { ReactElement } from "react";

import { AddTransactionModal } from "../components/AddTransactionModal";
import { useTransactionModal } from "../store/useTransactionModal";
import { ApiClientError } from "@/lib/api/client";
import { toCategory } from "@/features/categories/categoriesService";
import { mapWalletRecord } from "@/features/wallets/walletsService";
import type { Category } from "@/types/category";
import type { Transaction } from "@/types/transaction";

const TEST_WALLET = vi.hoisted(() => ({ id: "64b0000000000000000000a1", name: "Cash wallet" }));

vi.mock("@/features/wallets/walletsService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/wallets/walletsService")>();
  return {
    ...actual,
    getWallets: vi.fn(async () => [actual.mapWalletRecord({ ...TEST_WALLET, balance: 1000 })]),
  };
});
vi.mock("@/features/categories/categoriesService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/categories/categoriesService")>()),
  getCategories: vi.fn(async () => []),
}));

/** The modal reads wallets/categories through TanStack Query, so it needs a provider (wallets pre-seeded so the picker is populated on first render). */
function render(ui: ReactElement, { categories }: { categories?: Category[] } = {}) {
  // `staleTime: Infinity` keeps the seeded data instead of refetching it through the mocked services.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(["wallets"], [mapWalletRecord({ ...TEST_WALLET, balance: 1000 })]);
  if (categories) client.setQueryData(["categories"], categories);
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** Server order (creation order): seeded defaults with "Others" last per type, then a custom one. */
const TEST_CATEGORIES: Category[] = [
  toCategory({ id: "c-food", name: "Food & Drinks", type: "expense", icon: "Utensils", isSystem: true }),
  toCategory({ id: "c-car", name: "Transportation", type: "expense", icon: "Car", isSystem: true }),
  toCategory({ id: "c-others-exp", name: "Others", type: "expense", icon: "MoreHorizontal", isSystem: true }),
  toCategory({ id: "c-salary", name: "Salary", type: "income", icon: "Wallet", isSystem: true }),
  toCategory({ id: "c-others-inc", name: "Others", type: "income", icon: "MoreHorizontal", isSystem: true }),
  toCategory({ id: "c-custom-others", name: "Others", type: "expense", icon: "Star", isSystem: false }),
];

const categoryGroup = () => within(screen.getByRole("radiogroup", { name: "Category" }));
const categoryChipNames = () => categoryGroup().getAllByRole("radio").map((chip) => chip.textContent);
const selectedChip = () => categoryGroup().getByRole("radio", { checked: true });

beforeEach(() => {
  useTransactionModal.setState({
    isOpen: false,
    defaultType: "expense",
    editingTransaction: null,
    deletingTransaction: null,
  });
});
afterEach(() => cleanup());

/** Fills every required field (title, amount, date, wallet) via the real UI. */
async function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Grab ride" } });
  // Field label follows the expense/income theme ("Money out" for the test's default expense type), not a literal "Amount".
  fireEvent.change(screen.getByLabelText("Money out"), { target: { value: "120" } });
  fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-10-03" } });

  // Field label follows the expense/income theme ("Pay from wallet" for the test's default expense type), not a literal "Wallet".
  fireEvent.click(screen.getByLabelText("Pay from wallet"));
  const option = await screen.findByText(TEST_WALLET.name);
  fireEvent.click(option);
}

describe("AddTransactionModal — US3-1 async create (Add mode only)", () => {
  it("awaits onAdd, stays open and disabled until it resolves, then closes", async () => {
    let resolveAdd!: () => void;
    const onAdd = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAdd = resolve;
        })
    );
    useTransactionModal.setState({ isOpen: true, defaultType: "expense", editingTransaction: null });
    render(<AddTransactionModal onAdd={onAdd} />);

    await fillRequiredFields();
    fireEvent.click(screen.getByText("Save expense"));

    // Pending: onAdd was called, the modal is still open and the submit
    // button is disabled — can't double-submit or dismiss mid-request.
    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Grab ride", amount: 120, walletId: TEST_WALLET.id })
    );
    expect(screen.getByText("Saving…")).toBeDisabled();
    expect(useTransactionModal.getState().isOpen).toBe(true);

    resolveAdd();
    await waitFor(() => expect(useTransactionModal.getState().isOpen).toBe(false));
  });

  it("shows the server's error and keeps the modal open when onAdd rejects", async () => {
    const onAdd = vi.fn().mockRejectedValue(new ApiClientError("Wallet not found", 404));
    useTransactionModal.setState({ isOpen: true, defaultType: "expense", editingTransaction: null });
    render(<AddTransactionModal onAdd={onAdd} />);

    await fillRequiredFields();
    fireEvent.click(screen.getByText("Save expense"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Wallet not found");
    expect(useTransactionModal.getState().isOpen).toBe(true);
  });

  it("clears the stale submission error once the user edits a field", async () => {
    const onAdd = vi.fn().mockRejectedValue(new ApiClientError("Wallet not found", 404));
    useTransactionModal.setState({ isOpen: true, defaultType: "expense", editingTransaction: null });
    render(<AddTransactionModal onAdd={onAdd} />);

    await fillRequiredFields();
    fireEvent.click(screen.getByText("Save expense"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Wallet not found");

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Grab ride (retry)" } });

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("shows an error instead of silently closing when onAdd isn't wired", async () => {
    useTransactionModal.setState({ isOpen: true, defaultType: "expense", editingTransaction: null });
    render(<AddTransactionModal />);

    await fillRequiredFields();
    fireEvent.click(screen.getByText("Save expense"));

    expect(await screen.findByRole("alert")).toHaveTextContent("isn't connected");
    expect(useTransactionModal.getState().isOpen).toBe(true);
  });
});

describe("AddTransactionModal — US3-2 async edit", () => {
  const existing: Transaction = {
    id: "tx1",
    title: "Lunch",
    amount: 50,
    type: "expense",
    walletId: TEST_WALLET.id,
    date: new Date(2026, 9, 5),
  };
  const openEdit = () =>
    useTransactionModal.setState({ isOpen: true, defaultType: "expense", editingTransaction: existing });

  it("awaits onEdit with the merged row, then closes", async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    openEdit();
    render(<AddTransactionModal onEdit={onEdit} />);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Lunch with team" } });
    fireEvent.click(screen.getByText("Save changes"));

    await waitFor(() => expect(useTransactionModal.getState().isOpen).toBe(false));
    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: "tx1", title: "Lunch with team", amount: 50, walletId: existing.walletId })
    );
  });

  it("keeps the modal open and shows the server's message when the update fails", async () => {
    const onEdit = vi.fn().mockRejectedValue(new ApiClientError("Transaction not found", 404));
    openEdit();
    render(<AddTransactionModal onEdit={onEdit} />);

    fireEvent.click(screen.getByText("Save changes"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Transaction not found");
    expect(useTransactionModal.getState().isOpen).toBe(true);
  });

  it("locks the wallet, since the update API can't move a transaction", () => {
    openEdit();
    render(<AddTransactionModal onEdit={vi.fn()} />);

    expect(screen.getByLabelText("Pay from wallet")).toBeDisabled();
  });
});

describe("AddTransactionModal — category chips (#138)", () => {
  it("lists the seeded Others first and has no Uncategorized chip", () => {
    useTransactionModal.setState({ isOpen: true, defaultType: "expense", editingTransaction: null });
    render(<AddTransactionModal onAdd={vi.fn()} />, { categories: TEST_CATEGORIES });

    expect(categoryChipNames()).toEqual(["Others", "Food & Drinks", "Transportation", "Others"]);
    expect(screen.queryByText("Uncategorized")).not.toBeInTheDocument();
  });

  it("preselects the seeded Others for a new transaction and submits it", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    useTransactionModal.setState({ isOpen: true, defaultType: "expense", editingTransaction: null });
    render(<AddTransactionModal onAdd={onAdd} />, { categories: TEST_CATEGORIES });

    await waitFor(() => expect(selectedChip()).toHaveTextContent("Others"));
    await fillRequiredFields();
    fireEvent.click(screen.getByText("Save expense"));

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ categoryId: "c-others-exp" })));
  });

  it("switches to the new type's Others when toggling Expense/Income", async () => {
    useTransactionModal.setState({ isOpen: true, defaultType: "expense", editingTransaction: null });
    render(<AddTransactionModal onAdd={vi.fn()} />, { categories: TEST_CATEGORIES });

    fireEvent.click(screen.getByText("Food & Drinks"));
    await waitFor(() => expect(selectedChip()).toHaveTextContent("Food & Drinks"));

    fireEvent.click(screen.getByRole("radio", { name: "Income" }));

    expect(categoryChipNames()).toEqual(["Others", "Salary"]);
    await waitFor(() => expect(selectedChip()).toHaveTextContent("Others"));
  });

  it("preselects Others when editing a transaction that has no category", async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    useTransactionModal.setState({
      isOpen: true,
      defaultType: "expense",
      editingTransaction: { id: "tx2", title: "Snack", amount: 20, type: "expense", walletId: TEST_WALLET.id, date: new Date(2026, 9, 5) },
    });
    render(<AddTransactionModal onEdit={onEdit} />, { categories: TEST_CATEGORIES });

    await waitFor(() => expect(selectedChip()).toHaveTextContent("Others"));
    fireEvent.click(screen.getByText("Save changes"));

    await waitFor(() => expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ categoryId: "c-others-exp" })));
  });
});
