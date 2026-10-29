// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { PiggyBank, Wallet as WalletIcon } from "lucide-react";

import { WalletCard } from "../components/WalletCard";
import type { Wallet } from "@/types/wallet";

const baseWallet: Wallet = {
  id: "wallet-test-1",
  name: "Emergency Fund",
  balance: 22400,
  isDefault: false,
  color: "#10B981",
  isSaving: true,
  savingGoal: 20000,
  goalAmount: 20000,
  icon: PiggyBank,
  type: "savings",
};

describe("WalletCard — Goal Reached Celebration", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders celebratory confetti and reached status when saving goal is reached", () => {
    const { container } = render(
      <WalletCard
        wallet={baseWallet}
        onEdit={vi.fn()}
        onEditSaving={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    // Goal reached text is displayed
    expect(screen.getByText("Goal reached! 🎉")).toBeInTheDocument();
    expect(screen.getByText("100% saved")).toBeInTheDocument();
    expect(screen.getByText("Goal: ฿20,000")).toBeInTheDocument();

    // Piggy bank illustration should NOT be present (user requested removal)
    const piggyImg = container.querySelector("img[src*='piggy-goal-reached.png']");
    expect(piggyImg).not.toBeInTheDocument();

    // Confetti pieces are present
    const confettiContainer = container.querySelector("[aria-hidden='true'].pointer-events-none");
    expect(confettiContainer).toBeInTheDocument();

    // "ยินดีด้วย" text box should NOT be present (as requested)
    expect(screen.queryByText(/ยินดีด้วย/)).not.toBeInTheDocument();
  });

  it("does not render celebration layer when saving goal is not yet reached", () => {
    const notReachedWallet: Wallet = {
      ...baseWallet,
      balance: 15000,
      savingGoal: 20000,
    };

    const { container } = render(
      <WalletCard
        wallet={notReachedWallet}
        onEdit={vi.fn()}
        onEditSaving={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("฿5,000 left")).toBeInTheDocument();
    expect(screen.queryByText("Goal reached! 🎉")).not.toBeInTheDocument();

    // Piggy bank illustration should NOT be rendered
    const piggyImg = container.querySelector("img[src*='piggy-goal-reached.png']");
    expect(piggyImg).not.toBeInTheDocument();
  });

  it("does not render celebration layer for normal (non-saving) wallet", () => {
    const normalWallet: Wallet = {
      id: "wallet-normal",
      name: "Main Cash",
      balance: 50000,
      isDefault: true,
      color: "#4A4757",
      isSaving: false,
      icon: WalletIcon,
      type: "cash",
    };

    const { container } = render(
      <WalletCard
        wallet={normalWallet}
        onEdit={vi.fn()}
        onEditSaving={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Main Cash")).toBeInTheDocument();
    expect(screen.queryByText("Goal reached! 🎉")).not.toBeInTheDocument();

    const piggyImg = container.querySelector("img[src*='piggy-goal-reached.png']");
    expect(piggyImg).not.toBeInTheDocument();
  });
});
