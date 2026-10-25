// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("saves updated cadence without spreading stale rule properties", async () => {
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

    // Update interval to 3
    const intervalInput = screen.getByLabelText(/interval count/i);
    await user.clear(intervalInput);
    await user.type(intervalInput, "3");

    // Update note
    const noteInput = screen.getByLabelText(/note/i);
    await user.type(noteInput, "Updated gym pass");

    const submitBtn = screen.getByRole("button", { name: /save future changes/i });
    await user.click(submitBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    const savePayload = onSave.mock.calls[0][1];
    expect(savePayload.intervalN).toBe(3);
    expect(savePayload.note).toBe("Updated gym pass");
    // Ensure rule is not spread directly with stale internal scheduler fields like postedCount or id
    expect(savePayload.postedCount).toBeUndefined();
    expect(savePayload.createdAt).toBeUndefined();
  });

  it("synchronizes displayed fallback end date to parent when start date is changed after end date", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    // Rule with monthly cadence ending on 2026-03-01
    const ruleWithEnd: RecurringRule = {
      ...mockRule,
      startDate: "2026-01-01",
      endType: "date",
      endDate: "2026-03-01",
    };

    render(
      <EditRuleModal
        rule={ruleWithEnd}
        open={true}
        onOpenChange={vi.fn()}
        wallets={mockWallets}
        categories={mockCategories}
        onSave={onSave}
      />
    );

    // Change start date to 2026-06-01 (after the current end date)
    const startDateInput = screen.getByLabelText(/start date/i);
    fireEvent.change(startDateInput, { target: { value: "2026-06-01" } });

    // The ends on description should now reflect the synchronized fallback (2026-07-01)
    expect(
      screen.getByText((content) => content.includes("2026-07-01"))
    ).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /save future changes/i });
    await user.click(submitBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    const savePayload = onSave.mock.calls[0][1];
    expect(savePayload.startDate).toBe("2026-06-01");
    expect(savePayload.endDate).toBe("2026-07-01");
  });

  it("keeps the saved end month on a valid occurrence when the start date changes", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <EditRuleModal
        // Every 2 months from March allows May, July...; the stored June end is not an occurrence.
        rule={{ ...mockRule, intervalN: 2, intervalUnit: "months", startDate: "2027-03-10", endType: "date", endDate: "2027-06-10" }}
        open={true}
        onOpenChange={vi.fn()}
        wallets={mockWallets}
        categories={mockCategories}
        onSave={onSave}
      />
    );

    await user.click(screen.getByRole("button", { name: "Next day" }));
    await user.click(screen.getByRole("button", { name: /Save Future Changes/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][1]).toMatchObject({ startDate: "2027-03-11", endDate: "2027-05-11" });
  });
});

