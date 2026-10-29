// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tag, Wallet as WalletIcon } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Category } from "@/types/category";
import type { Wallet } from "@/types/wallet";
import { CreateRuleModal } from "../components/CreateRuleModal";

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
    name: "Food",
    type: "expense",
    icon: Tag,
  },
  {
    id: "c2",
    name: "Salary",
    type: "income",
    icon: Tag,
  },
];

describe("CreateRuleModal (US4-1)", () => {
  it("renders form with all inputs and toggles", () => {
    render(
      <CreateRuleModal
        open={true}
        onOpenChange={vi.fn()}
        wallets={mockWallets}
        categories={mockCategories}
        authorAttribution="Alex Demo"
        onCreateRule={vi.fn()}
      />
    );

    expect(screen.getByText(/New Recurring Expense/i)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /expense/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /income/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByText("Custom Frequency & Interval (US4-1)")).toBeInTheDocument();
    expect(screen.getByText(/never/i)).toBeInTheDocument();
    expect(screen.getByText(/after fixed number of occurrences/i)).toBeInTheDocument();
    expect(screen.getByText(/on specific end date/i)).toBeInTheDocument();
  });

  it("validates amount <= 0 and shows error message", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <CreateRuleModal
        open={true}
        onOpenChange={vi.fn()}
        wallets={mockWallets}
        categories={mockCategories}
        authorAttribution="Alex Demo"
        onCreateRule={onCreate}
      />
    );

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "Test Rule");

    const amountInput = screen.getByLabelText(/amount/i);
    await user.type(amountInput, "0");

    const submitBtn = screen.getByRole("button", { name: /save recurring rule/i });
    await user.click(submitBtn);

    expect(screen.getByText("Amount must be greater than ฿0")).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("validates interval limits (e.g. months > 60)", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <CreateRuleModal
        open={true}
        onOpenChange={vi.fn()}
        wallets={mockWallets}
        categories={mockCategories}
        authorAttribution="Alex Demo"
        onCreateRule={onCreate}
      />
    );

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "Test Limit");

    const amountInput = screen.getByLabelText(/amount/i);
    await user.type(amountInput, "500");

    // Default unit is months, set interval count to 70 (> 60 limit)
    const intervalInput = screen.getByLabelText("Interval count");
    fireEvent.change(intervalInput, { target: { value: "70" } });

    const submitBtn = screen.getByRole("button", { name: /save recurring rule/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Months interval cannot exceed 60")).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("validates end date strictly after start date", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <CreateRuleModal
        open={true}
        onOpenChange={vi.fn()}
        wallets={mockWallets}
        categories={mockCategories}
        authorAttribution="Alex Demo"
        onCreateRule={onCreate}
      />
    );

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "Test End Date");

    const amountInput = screen.getByLabelText(/amount/i);
    await user.type(amountInput, "1000");

    // Select 'On specific end date'
    const dateRadio = screen.getByLabelText(/on specific end date/i);
    fireEvent.click(dateRadio);

    // With default 'months' cadence, an <input type="month"> is rendered
    const monthInput = document.querySelector('input[type="month"]') as HTMLInputElement;
    if (monthInput) {
      fireEvent.change(monthInput, { target: { value: "2025-01" } });
    } else {
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      if (dateInput) {
        fireEvent.change(dateInput, { target: { value: "2025-01-01" } });
      }
    }

    const submitBtn = screen.getByRole("button", { name: /save recurring rule/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText("End date must be strictly after the start date")
    ).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("submits valid recurring rule", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(
      <CreateRuleModal
        open={true}
        onOpenChange={vi.fn()}
        wallets={mockWallets}
        categories={mockCategories}
        authorAttribution="Alex Demo"
        onCreateRule={onCreate}
      />
    );

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "Spotify Family");

    const amountInput = screen.getByLabelText(/amount/i);
    await user.type(amountInput, "299");

    const submitBtn = screen.getByRole("button", { name: /save recurring rule/i });
    await user.click(submitBtn);

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Spotify Family",
        amount: 299,
        type: "expense",
        walletId: "w1",
        intervalN: 1,
        intervalUnit: "months",
        status: "active",
      })
    );
  });

  it("validates that frequency interval cannot be empty", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <CreateRuleModal
        open={true}
        onOpenChange={vi.fn()}
        wallets={mockWallets}
        categories={mockCategories}
        authorAttribution="Alex Demo"
        onCreateRule={onCreate}
      />
    );

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "Test Rule");

    const amountInput = screen.getByLabelText(/amount/i);
    await user.type(amountInput, "100");

    // Empty interval count
    const intervalInput = screen.getByLabelText("Interval count");
    fireEvent.change(intervalInput, { target: { value: "" } });

    const submitBtn = screen.getByRole("button", { name: /save recurring rule/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Please enter a frequency interval")).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("creates recurring rule targeting a shared wallet with shared category preset (US7-6)", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const mockSharedWallet: Wallet = {
      id: "w-shared",
      name: "Housemate Fund",
      balance: 20000,
      icon: WalletIcon,
      isShared: true,
    };

    render(
      <CreateRuleModal
        open={true}
        onOpenChange={vi.fn()}
        wallets={[...mockWallets, mockSharedWallet]}
        categories={mockCategories}
        authorAttribution="Alex Demo"
        onCreateRule={onCreate}
      />
    );

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "Monthly Rent");

    const amountInput = screen.getByLabelText(/amount/i);
    await user.type(amountInput, "4000");

    // Select the shared wallet
    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(await screen.findByRole("option", { name: /Housemate Fund/i }));

    // The category dropdown should now show presets such as "Utilities" instead of personal categories
    const categoryCombobox = screen.getAllByRole("combobox")[1];
    await user.click(categoryCombobox);
    await user.click(await screen.findByRole("option", { name: /Utilities/i }));

    const submitBtn = screen.getByRole("button", { name: /save recurring rule/i });
    await user.click(submitBtn);

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Monthly Rent",
        amount: 4000,
        type: "expense",
        walletId: "w-shared",
        categoryId: null,
        categoryKey: "utilities",
        intervalN: 1,
        intervalUnit: "months",
        status: "active",
      })
    );
  });
});

