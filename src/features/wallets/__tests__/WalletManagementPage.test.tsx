// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import { WalletManagementPage } from "../components/WalletManagementPage";
import { DeleteWalletDialog } from "../components/DeleteWalletDialog";
import * as walletsService from "../walletsService";
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
    window.sessionStorage.removeItem("walletView");
    useActiveWallet.setState({ activeWalletId: "all" });
    vi.spyOn(walletsService, "getWallets").mockResolvedValue(testWallets);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders page header, stats and wallets list", async () => {
    renderWithClient(<WalletManagementPage />);

    expect(await screen.findByRole("heading", { name: "Wallets" })).toBeInTheDocument();
    expect(await screen.findByText("Main Cash")).toBeInTheDocument();
    expect(screen.getByText("Trip Fund")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("does not render Hide Balances button, Active Wallet card, or Daily/Saving subtitles", async () => {
    renderWithClient(<WalletManagementPage />);

    expect(await screen.findByText("Main Cash")).toBeInTheDocument();
    expect(screen.queryByText("Hide Balances")).not.toBeInTheDocument();
    expect(screen.queryByText("Show Balances")).not.toBeInTheDocument();
    expect(screen.queryByText("Active Wallet")).not.toBeInTheDocument();
    expect(screen.queryByText("Daily Wallet")).not.toBeInTheDocument();
    expect(screen.queryByText("Saving Wallet")).not.toBeInTheDocument();
    expect(screen.queryByText("Set Active")).not.toBeInTheDocument();
    expect(screen.queryByText("Select as Active")).not.toBeInTheDocument();
  });

  it("marks no wallet card as active and offers no Select as Active action", async () => {
    // A wallet picked on Home (or by clicking its name here) stays plain on this page.
    useActiveWallet.setState({ activeWalletId: "wallet-1" });
    renderWithClient(<WalletManagementPage />);

    const card = (await screen.findByText("Main Cash")).closest('[data-slot="card"]') as HTMLElement;
    expect(card.className).not.toMatch(/ring-primary|ring-offset/);
    // The border keeps the same soft tint as every other card.
    expect(card.style.borderColor).not.toBe("rgb(74, 71, 87)");

    fireEvent.pointerDown(within(card).getByRole("button", { name: "Wallet actions" }), { button: 0, ctrlKey: false });
    fireEvent.click(within(card).getByRole("button", { name: "Wallet actions" }));
    expect(await screen.findByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Select as Active/ })).not.toBeInTheDocument();
  });

  it("opens Create Wallet dialog when clicking Create Wallet button", async () => {
    renderWithClient(<WalletManagementPage />);

    await screen.findByText("Main Cash");
    fireEvent.click(screen.getByRole("button", { name: "Create Wallet" }));

    expect(await screen.findByRole("heading", { name: "Create Wallet" })).toBeInTheDocument();
    expect(screen.getByLabelText("Wallet Name")).toBeInTheDocument();
  });

  it("renders the delete-wallet description without nesting paragraphs", () => {
    renderWithClient(
      <DeleteWalletDialog wallet={testWallets[0]} open onOpenChange={vi.fn()} />
    );

    const description = document.querySelector('[data-slot="alert-dialog-description"]');
    expect(description?.tagName).toBe("DIV");
    expect(description?.querySelectorAll(":scope > p")).toHaveLength(2);
  });

  it("renders empty state when there are no wallets", async () => {
    vi.spyOn(walletsService, "getWallets").mockResolvedValue([]);
    renderWithClient(<WalletManagementPage />);

    expect(await screen.findByText("No wallets created yet")).toBeInTheDocument();
  });
});

