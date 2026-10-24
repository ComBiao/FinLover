// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import { CURRENT_USER_QUERY_KEY } from "@/features/auth/hooks/useCurrentUser";
import * as categoriesService from "@/features/categories/categoriesService";
import * as invitationsService from "@/features/wallets/shared/invitationsService";
import * as membersService from "@/features/wallets/shared/membersService";
import { useActiveWallet } from "@/features/wallets/store/useActiveWallet";
import { useBalanceVisibility } from "@/features/wallets/store/useBalanceVisibility";
import * as walletsService from "@/features/wallets/walletsService";
import { useTransactionModal } from "@/features/transactions/store/useTransactionModal";
import * as transactionsService from "@/features/transactions/transactionsService";
import {
  OWNED_SHARED_WALLET,
  OWNER_VIEW_MEMBERS,
  PERSONAL_WALLET,
  sharedTransactions,
} from "@/test/shared-wallet-fixtures";
import type { Transaction } from "@/types/transaction";
import { HomePage } from "../components/HomePage";
import { currentMonthKey, parseMonthKey } from "../month";
import * as homeService from "../services/homeService";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const month = currentMonthKey();
const { year, month: monthNumber } = parseMonthKey(month);

const PERSONAL_ROW: Transaction = {
  id: "tx-personal",
  walletId: PERSONAL_WALLET.id,
  categoryId: undefined,
  type: "expense",
  amount: 150,
  date: new Date(year, monthNumber - 1, 5, 12),
  title: "Lunch Noodles",
};
const SHARED_ROWS = sharedTransactions(year, monthNumber);

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  client.setQueryData(CURRENT_USER_QUERY_KEY, { id: "u-me", email: "tul@example.com", name: "Tul" });
  return render(
    <QueryClientProvider client={client}>
      <HomePage />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useBalanceVisibility.setState({ isVisible: true });
  useActiveWallet.setState({ activeWalletId: "all" });
  useTransactionModal.setState({ isOpen: false, defaultType: "expense", defaultWalletId: undefined, editingTransaction: null, deletingTransaction: null });

  vi.spyOn(walletsService, "getWallets").mockResolvedValue([PERSONAL_WALLET, OWNED_SHARED_WALLET]);
  vi.spyOn(categoriesService, "getCategories").mockResolvedValue([]);
  // The personal list also carries the user's own row in the shared wallet (a real backend may include it).
  vi.spyOn(transactionsService, "getTransactions").mockResolvedValue([PERSONAL_ROW, SHARED_ROWS[1]]);
  vi.spyOn(transactionsService, "getSharedWalletTransactions").mockResolvedValue(SHARED_ROWS);
  vi.spyOn(invitationsService, "getInvitations").mockResolvedValue([]);
  vi.spyOn(membersService, "getMembers").mockResolvedValue(OWNER_VIEW_MEMBERS);
  vi.spyOn(homeService, "getHomeSummary").mockImplementation(async (summaryMonth, walletId) => ({
    month: summaryMonth,
    walletId,
    balance: { hasWallets: true, totalBalance: walletId === OWNED_SHARED_WALLET.id ? 9391 : 5000, savingGoal: null },
    income: walletId === OWNED_SHARED_WALLET.id ? 12000 : 0,
    expense: walletId === OWNED_SHARED_WALLET.id ? 2609 : 150,
    net: { net: walletId === OWNED_SHARED_WALLET.id ? 9391 : -150, status: walletId === OWNED_SHARED_WALLET.id ? "surplus" : "overspending" },
    topCategories: [],
  }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Home — All wallets stays personal", () => {
  it("leaves shared-wallet rows and shared controls out", async () => {
    renderHome();

    expect((await screen.findAllByText("Lunch Noodles")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Rent share")).not.toBeInTheDocument();
    expect(screen.getByText("1 transaction")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /members?$/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Top categories/)).toBeInTheDocument();
    expect(transactionsService.getSharedWalletTransactions).not.toHaveBeenCalled();
  });

  it("has the notification bell next to Add Transaction", async () => {
    renderHome();

    expect(await screen.findByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Transaction" })).toBeInTheDocument();
  });
});

describe("Home — a shared wallet selected", () => {
  beforeEach(() => {
    useActiveWallet.setState({ activeWalletId: OWNED_SHARED_WALLET.id });
  });

  it("loads that wallet's month from every member", async () => {
    renderHome();

    expect((await screen.findAllByText("Internet")).length).toBeGreaterThan(0);
    expect(transactionsService.getSharedWalletTransactions).toHaveBeenCalledWith(OWNED_SHARED_WALLET.id, month);
    expect(homeService.getHomeSummary).toHaveBeenCalledWith(month, OWNED_SHARED_WALLET.id);
    expect(screen.getByText("2 transactions")).toBeInTheDocument();
    expect(screen.queryByText("Lunch Noodles")).not.toBeInTheDocument();
  });

  it("shows who logged each row, with Logged by in place of Category", async () => {
    renderHome();

    expect((await screen.findAllByText("Logged by Guy")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("edited by Tul (you)").length).toBeGreaterThan(0);
    expect(screen.getByRole("columnheader", { name: "Logged by" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Category" })).not.toBeInTheDocument();
  });

  it("has no Top categories card, since shared wallets have no categories", async () => {
    renderHome();

    await screen.findAllByText("Internet");
    expect(screen.queryByText(/Top categories/)).not.toBeInTheDocument();
  });

  it("shows the member count and opens the Members dialog from it", async () => {
    renderHome();

    const button = await screen.findByRole("button", { name: "3 members" });
    fireEvent.click(button);

    expect(await screen.findByRole("heading", { name: "Members" })).toBeInTheDocument();
    expect(await screen.findByText("Housemate Fund · 3 members, 1 pending")).toBeInTheDocument();
  });

  it("Add Transaction starts on the selected shared wallet", async () => {
    renderHome();

    await screen.findAllByText("Internet");
    fireEvent.click(screen.getByRole("button", { name: "Add Transaction" }));

    await waitFor(() => expect(useTransactionModal.getState().defaultWalletId).toBe(OWNED_SHARED_WALLET.id));
    expect(useTransactionModal.getState().isOpen).toBe(true);
  });

  it("falls back to All wallets when the shared wallet is gone", async () => {
    vi.spyOn(walletsService, "getWallets").mockResolvedValue([PERSONAL_WALLET]);
    renderHome();

    await waitFor(() => expect(useActiveWallet.getState().activeWalletId).toBe("all"));
  });
});

describe("Home — wallet dropdown", () => {
  function openDropdown() {
    const trigger = document.querySelector('[aria-haspopup="listbox"]') as HTMLElement;
    fireEvent.click(trigger);
    return screen.findByRole("option", { name: /All wallets/ });
  }

  it("groups shared wallets under their own heading and totals only personal ones", async () => {
    renderHome();
    await screen.findAllByText("Lunch Noodles");

    const allOption = await openDropdown();
    expect(allOption).toHaveTextContent("Personal only");
    expect(allOption).toHaveTextContent("฿5,000"); // not ฿14,391
    expect(screen.getByText("Shared wallets")).toBeInTheDocument();
    const shared = screen.getByRole("option", { name: /Housemate Fund/ });
    expect(shared).toHaveTextContent("3 members");
    expect(within(shared).getByText("฿9,391")).toBeInTheDocument();
  });

  it("selects a shared wallet from the list", async () => {
    renderHome();
    await screen.findAllByText("Lunch Noodles");

    await openDropdown();
    fireEvent.click(screen.getByRole("option", { name: /Housemate Fund/ }));

    expect(useActiveWallet.getState().activeWalletId).toBe(OWNED_SHARED_WALLET.id);
    expect(await screen.findByRole("button", { name: "3 members" })).toBeInTheDocument();
  });
});
