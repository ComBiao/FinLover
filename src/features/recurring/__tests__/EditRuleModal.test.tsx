// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tag, Wallet as WalletIcon } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Category } from "@/types/category";
import type { Wallet } from "@/types/wallet";
import { EditRuleModal } from "../components/EditRuleModal";
import type { RecurringRule } from "../types";

afterEach(() => {
  cleanup();
});

const mockWallets: Wallet[] = [
  {
    id: "w1",
    name: "Main Bank",
    balance: 50000,
    icon: WalletIcon,
  },
  {
    id: "w2",
    name: "Cash",
    balance: 5000,
    icon: WalletIcon,
  },
];

const mockCategories: Category[] = [
  {
    id: "c1",
    name: "Fitness",
    type: "expense",
    icon: Tag,
  },
];

const mockRule: RecurringRule = {
  id: "r1",
  title: "Fitness Center",
  amount: 1200,
  type: "expense",
  walletId: "w1",
  categoryId: "c1",
  intervalN: 1,
  intervalUnit: "months",
  anchorDay: 1,
  startDate: "2026-01-01",
  nextRunDate: "2026-11-01",
  endType: "never",
  postedCount: 10,
  status: "active",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("EditRuleModal (US4-5)", () => {
  it("displays safety notice regarding ledger preservation and populates fields", () => {
    render(
      <EditRuleModal
        rule={mockRule}
        open={true}
        onOpenChange={vi.fn()}
        wallets={mockWallets}
        categories={mockCategories}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText("Edit Recurring Transaction")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Changes will only apply to future scheduled occurrences. Past recorded transactions remain unchanged."
      )
    ).toBeInTheDocument();

    expect(screen.getByDisplayValue("Fitness Center")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1200")).toBeInTheDocument();
  });

  it("updates future amount and cadence without touching historical records", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <EditRuleModal
        rule={mockRule}
        open={true}
        onOpenChange={vi.fn()}
        wallets={mockWallets}
        categories={mockCategories}
        onSave={onSave}
      />
    );

    const amountInput = screen.getByLabelText(/future amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, "1500");

    const submitBtn = screen.getByRole("button", { name: /save future changes/i });
    await user.click(submitBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      "r1",
      expect.objectContaining({
        amount: 1500,
        title: "Fitness Center",
        walletId: "w1",
      })
    );
  });
});

