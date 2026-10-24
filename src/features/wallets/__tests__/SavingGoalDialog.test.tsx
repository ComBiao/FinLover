// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import { PERSONAL_WALLET } from "@/test/shared-wallet-fixtures";
import { SavingGoalDialog } from "../components/SavingGoalDialog";
import * as walletsService from "../walletsService";
import type { Wallet } from "@/types/wallet";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function renderDialog(wallet: Wallet, onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <SavingGoalDialog wallet={wallet} open onOpenChange={onOpenChange} />
    </QueryClientProvider>
  );
  return { onOpenChange };
}

const savingSwitch = () => screen.getByRole("switch", { name: "Enable saving goal for this wallet" });

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SavingGoalDialog — switch", () => {
  it("is an off switch for a wallet without a goal, with the explanation shown", () => {
    renderDialog(PERSONAL_WALLET);

    expect(savingSwitch()).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByLabelText("Target Goal Amount (฿)")).not.toBeInTheDocument();
    expect(screen.getByText(/Disabling saving will clear the goal amount/)).toBeInTheDocument();
  });

  it("starts on, with the current goal filled in, for a saving wallet", () => {
    renderDialog({ ...PERSONAL_WALLET, isSaving: true, savingGoal: 20000, goalAmount: 20000 });

    expect(savingSwitch()).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Target Goal Amount (฿)")).toHaveValue(20000);
  });

  it("saves the goal once the switch is on", async () => {
    const update = vi.spyOn(walletsService, "updateWalletSaving").mockResolvedValue({
      ...PERSONAL_WALLET,
      isSaving: true,
      goalAmount: 15000,
    });
    const { onOpenChange } = renderDialog(PERSONAL_WALLET);

    fireEvent.click(savingSwitch());
    fireEvent.change(screen.getByLabelText("Target Goal Amount (฿)"), { target: { value: "15000" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Goal" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith(PERSONAL_WALLET.id, { isSaving: true, goalAmount: 15000 }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("refuses a goal of zero", () => {
    const update = vi.spyOn(walletsService, "updateWalletSaving");
    renderDialog(PERSONAL_WALLET);

    fireEvent.click(savingSwitch());
    fireEvent.change(screen.getByLabelText("Target Goal Amount (฿)"), { target: { value: "0" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save Goal" }).closest("form")!);

    expect(screen.getByRole("alert")).toHaveTextContent("Goal amount must be greater than 0");
    expect(update).not.toHaveBeenCalled();
  });
});
