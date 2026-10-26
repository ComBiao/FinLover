// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tag, Wallet as WalletIcon } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Category } from "@/types/category";
import type { Wallet } from "@/types/wallet";
import { RulesTable } from "../components/RulesTable";
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
];

const mockCategories: Category[] = [
  {
    id: "c1",
    name: "Streaming",
    type: "expense",
    icon: Tag,
  },
];

const mockRules: RecurringRule[] = [
  {
    id: "r1",
    title: "Netflix 4K",
    amount: 419,
    type: "expense",
    walletId: "w1",
    categoryId: "c1",
    intervalN: 1,
    intervalUnit: "months",
    anchorDay: 23,
    startDate: "2026-08-23",
    nextRunDate: "2026-10-23",
    endType: "never",
    postedCount: 2,
    status: "active",
    createdAt: "2026-08-23T00:00:00Z",
    updatedAt: "2026-08-23T00:00:00Z",
  },
  {
    id: "r2",
    title: "Gym Membership",
    amount: 1500,
    type: "expense",
    walletId: "w1",
    categoryId: null,
    intervalN: 1,
    intervalUnit: "months",
    anchorDay: 5,
    startDate: "2026-07-05",
    nextRunDate: "2026-11-05",
    endType: "count",
    totalOccurrences: 6,
    postedCount: 2,
    status: "paused",
    createdAt: "2026-07-05T00:00:00Z",
    updatedAt: "2026-07-05T00:00:00Z",
  },
  {
    id: "r3",
    title: "Loan Installment",
    amount: 2000,
    type: "expense",
    walletId: "w1",
    categoryId: null,
    intervalN: 1,
    intervalUnit: "months",
    anchorDay: 1,
    startDate: "2026-06-01",
    nextRunDate: "2026-09-01",
    endType: "date",
    endDate: "2026-09-01",
    postedCount: 3,
    status: "completed",
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
];

describe("RulesTable (US4-3, US4-4, US4-5)", () => {
  it("renders empty state illustration and CTA when rules list is empty", async () => {
    const user = userEvent.setup();
    const onOpenCreate = vi.fn();

    render(
      <RulesTable
        rules={[]}
        wallets={mockWallets}
        categories={mockCategories}
        simulatedDate="2026-10-23"
        onPause={vi.fn()}
        onResume={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenCreateModal={onOpenCreate}
      />
    );

    expect(await screen.findByText("No recurring transactions found")).toBeInTheDocument();
    const createBtn = screen.getByRole("button", { name: /create recurring transaction/i });
    expect(createBtn).toBeInTheDocument();

    await user.click(createBtn);
    expect(onOpenCreate).toHaveBeenCalledTimes(1);
  });

  it("renders rules with titles, currency amounts, cadences, end conditions, and status badges", async () => {
    render(
      <RulesTable
        rules={mockRules}
        wallets={mockWallets}
        categories={mockCategories}
        simulatedDate="2026-10-23"
        onPause={vi.fn()}
        onResume={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenCreateModal={vi.fn()}
      />
    );

    // Titles
    expect(await screen.findByText("Netflix 4K")).toBeInTheDocument();
    expect(screen.getByText("Gym Membership")).toBeInTheDocument();
    expect(screen.getByText("Loan Installment")).toBeInTheDocument();

    // Formatted amounts with ฿
    expect(screen.getByText("-฿419")).toBeInTheDocument();
    expect(screen.getByText("-฿1,500")).toBeInTheDocument();

    // Status badges
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();

    // End condition summaries
    expect(screen.getByText("Indefinite")).toBeInTheDocument();
    expect(screen.getByText(/Ongoing,/i)).toBeInTheDocument();
    expect(screen.getByText(/2 of 6 posted/i)).toBeInTheDocument();
    expect(screen.getByText("Ends on 2026-09-01")).toBeInTheDocument();

    // Next Run Date formatted as dd Mon YYYY
    expect(screen.getByText("23 Oct 2026")).toBeInTheDocument();
    expect(screen.getByText("05 Nov 2026")).toBeInTheDocument();

    // Start Date formatted as dd Mon YYYY
    expect(screen.getByText("Starts 23 Aug 2026")).toBeInTheDocument();
  });

  it("triggers quick-action pause for an active rule (US4-4)", async () => {
    const user = userEvent.setup();
    const onPause = vi.fn();

    render(
      <RulesTable
        rules={[mockRules[0]]} // active rule
        wallets={mockWallets}
        categories={mockCategories}
        simulatedDate="2026-10-23"
        onPause={onPause}
        onResume={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenCreateModal={vi.fn()}
      />
    );

    const pauseBtn = await screen.findByRole("button", { name: /pause rule/i });
    await user.click(pauseBtn);
    expect(onPause).toHaveBeenCalledWith("r1");
  });

  it("triggers quick-action resume for a paused rule (US4-4)", async () => {
    const user = userEvent.setup();
    const onResume = vi.fn();

    render(
      <RulesTable
        rules={[mockRules[1]]} // paused rule
        wallets={mockWallets}
        categories={mockCategories}
        simulatedDate="2026-10-23"
        onPause={vi.fn()}
        onResume={onResume}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenCreateModal={vi.fn()}
      />
    );

    const resumeBtn = await screen.findByRole("button", { name: /resume rule/i });
    await user.click(resumeBtn);
    expect(onResume).toHaveBeenCalledWith("r2");
  });

  it("shows delete confirmation warning regarding ledger preservation (US4-5)", async () => {
    const onDelete = vi.fn();

    render(
      <RulesTable
        rules={[mockRules[0]]}
        wallets={mockWallets}
        categories={mockCategories}
        simulatedDate="2026-10-23"
        onPause={vi.fn()}
        onResume={vi.fn()}
        onEdit={vi.fn()}
        onDelete={onDelete}
        onOpenCreateModal={vi.fn()}
      />
    );

    // Open dropdown menu
    const moreBtn = await screen.findByRole("button", { name: /more actions/i });
    fireEvent.click(moreBtn);

    // Find delete menu item
    const deleteMenuItem = await screen.findByRole("menuitem", { name: /delete rule/i });
    fireEvent.click(deleteMenuItem);

    // Check modal prompt
    expect(
      screen.getByText(/All past recorded transactions in your wallet ledger will be preserved/i)
    ).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByRole("button", { name: /halt & delete rule/i });
    fireEvent.click(confirmBtn);

    expect(onDelete).toHaveBeenCalledWith("r1");
  });

  it("does not render Edit option for completed rules, allowing only deletion", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <RulesTable
        rules={[mockRules[2]]} // completed rule
        wallets={mockWallets}
        categories={mockCategories}
        simulatedDate="2026-10-23"
        onPause={vi.fn()}
        onResume={vi.fn()}
        onEdit={onEdit}
        onDelete={onDelete}
        onOpenCreateModal={vi.fn()}
      />
    );

    // Open dropdown menu
    const moreBtn = await screen.findByRole("button", { name: /more actions/i });
    fireEvent.click(moreBtn);

    // Edit Rule should NOT be in the document
    expect(screen.queryByRole("menuitem", { name: /edit rule/i })).not.toBeInTheDocument();

    // Delete Rule should be present
    expect(await screen.findByRole("menuitem", { name: /delete rule/i })).toBeInTheDocument();
  });
});

