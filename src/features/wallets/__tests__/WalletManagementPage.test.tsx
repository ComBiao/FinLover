// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import { WalletManagementPage } from "../components/WalletManagementPage";
import * as walletsService from "../walletsService";
import { useBalanceVisibility } from "../store/useBalanceVisibility";
import { useActiveWallet } from "../store/useActiveWallet";
import type { Wallet } from "@/types/wallet";
import { PiggyBank, Wallet as WalletIcon } from "lucide-react";

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
    name: "Trip Fund",
    balance: 15000,
    isDefault: false,
    color: "#8B7CF6",
    isSaving: true,
    savingGoal: 20000,
    icon: PiggyBank,
    type: "savings",
  },
];

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("WalletManagementPage UI", () => {
  beforeEach(() => {
    useBalanceVisibility.setState({ isVisible: true });
    useActiveWallet.setState({ activeWalletId: "all" });
    vi.spyOn(walletsService, "getWallets").mockResolvedValue(testWallets);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders page header, stats and wallets list", async () => {
    renderWithClient(<WalletManagementPage />);

    expect(screen.getByRole("heading", { name: "Wallets" })).toBeInTheDocument();
    expect(await screen.findByText("Main Cash")).toBeInTheDocument();
    expect(screen.getByText("Trip Fund")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("toggles balance visibility when clicking the eye button (#78)", async () => {
    renderWithClient(<WalletManagementPage />);

    expect(await screen.findByText("Main Cash")).toBeInTheDocument();
    // Initially visible
    expect(screen.getByText("Hide Balances")).toBeInTheDocument();

    // Toggle hide
    fireEvent.click(screen.getByText("Hide Balances"));
    expect(screen.getByText("Show Balances")).toBeInTheDocument();
    expect(useBalanceVisibility.getState().isVisible).toBe(false);

    // Toggle back to show
    fireEvent.click(screen.getByText("Show Balances"));
    expect(useBalanceVisibility.getState().isVisible).toBe(true);
  });

  it("opens Create Wallet dialog when clicking Create Wallet button", async () => {
    renderWithClient(<WalletManagementPage />);

    await screen.findByText("Main Cash");
    fireEvent.click(screen.getByRole("button", { name: "Create Wallet" }));

    expect(await screen.findByRole("heading", { name: "Create Wallet" })).toBeInTheDocument();
    expect(screen.getByLabelText("Wallet Name")).toBeInTheDocument();
  });

  it("renders empty state when there are no wallets", async () => {
    vi.spyOn(walletsService, "getWallets").mockResolvedValue([]);
    renderWithClient(<WalletManagementPage />);

    expect(await screen.findByText("No wallets created yet")).toBeInTheDocument();
  });
});

