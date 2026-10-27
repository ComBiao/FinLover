// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

/** The desktop table. Phones get a card list of the same rules, which jsdom renders too (it ignores CSS), so row content is queried inside the table. */
const inTable = () => within(screen.getByRole("table"));

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
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(inTable().getByText("Netflix 4K")).toBeInTheDocument();
    expect(inTable().getByText("Gym Membership")).toBeInTheDocument();
    expect(inTable().getByText("Loan Installment")).toBeInTheDocument();

    // Formatted amounts with ฿
    expect(inTable().getByText("-฿419")).toBeInTheDocument();
    expect(inTable().getByText("-฿1,500")).toBeInTheDocument();

    // Status badges
    expect(inTable().getByText("Active")).toBeInTheDocument();
    expect(inTable().getByText("Paused")).toBeInTheDocument();
    expect(inTable().getByText("Completed")).toBeInTheDocument();

    // End condition summaries
    expect(inTable().getByText("Indefinite")).toBeInTheDocument();
    expect(inTable().getByText(/Ongoing,/i)).toBeInTheDocument();
    expect(inTable().getByText(/2 of 6 posted/i)).toBeInTheDocument();
    expect(inTable().getByText("Ends on 2026-09-01")).toBeInTheDocument();

    // Next Run Date formatted as dd Mon YYYY
    expect(inTable().getByText("23 Oct 2026")).toBeInTheDocument();
    expect(inTable().getByText("05 Nov 2026")).toBeInTheDocument();

    // Start Date formatted as dd Mon YYYY
    expect(inTable().getByText("Starts 23 Aug 2026")).toBeInTheDocument();
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

    const pauseBtn = within(await screen.findByRole("table")).getByRole("button", { name: /pause rule/i });
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

    const resumeBtn = within(await screen.findByRole("table")).getByRole("button", { name: /resume rule/i });
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
    const moreBtn = within(await screen.findByRole("table")).getByRole("button", { name: /more actions/i });
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
    const moreBtn = within(await screen.findByRole("table")).getByRole("button", { name: /more actions/i });
    fireEvent.click(moreBtn);

    // Edit Rule should NOT be in the document
    expect(screen.queryByRole("menuitem", { name: /edit rule/i })).not.toBeInTheDocument();

    // Delete Rule should be present
    expect(await screen.findByRole("menuitem", { name: /delete rule/i })).toBeInTheDocument();
  });

  it("lists every rule as a card for phones, with the same actions as the table", async () => {
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

    const cards = within(await screen.findByRole("list", { name: "Recurring rules" })).getAllByRole("listitem");
    expect(cards).toHaveLength(mockRules.length);
    expect(within(cards[0]).getByText("Netflix 4K")).toBeInTheDocument();
    expect(within(cards[0]).getByText("-฿419")).toBeInTheDocument();
    expect(within(cards[0]).getByRole("button", { name: /pause rule/i })).toBeInTheDocument();
    expect(within(cards[0]).getByRole("button", { name: /more actions/i })).toBeInTheDocument();
  });
});

