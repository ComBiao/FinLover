// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TransactionFilterBar } from "../components/TransactionFilterBar";
import { currentPeriod } from "../period";
import { toCategory } from "@/features/categories/categoriesService";
import { DEFAULT_TRANSACTION_FILTERS, type TransactionFilters } from "@/types/transaction";

const CATEGORIES = [
  toCategory({ id: "c-food", name: "Food & Drinks", type: "expense", icon: "Utensils", isSystem: true }),
  toCategory({ id: "c-salary", name: "Salary", type: "income", icon: "Wallet", isSystem: true }),
];

afterEach(() => cleanup());

function renderFilterBar(initial: Partial<TransactionFilters> = {}) {
  const onValueChange = vi.fn();

  function Harness() {
    const [filters, setFilters] = useState<TransactionFilters>({ ...DEFAULT_TRANSACTION_FILTERS, ...initial });
    return (
      <TransactionFilterBar
        value={filters}
        categories={CATEGORIES}
        onValueChange={(next) => {
          onValueChange(next);
          setFilters(next);
        }}
        period={currentPeriod()}
        onPeriodChange={() => {}}
        onPeriodModeChange={() => {}}
        onReset={() => {}}
      />
    );
  }

  render(<Harness />);
  return { onValueChange, lastValue: () => onValueChange.mock.lastCall?.[0] as TransactionFilters };
}

// The mobile panel stays collapsed, so the only selectors rendered are the
// desktop row's, in order: Type, Category, Wallet, then the period picker.
const typeSelect = () => screen.getAllByRole("combobox")[0];
const categorySelect = () => screen.getAllByRole("combobox")[1];

async function pick(combobox: HTMLElement, option: string) {
  const user = userEvent.setup();
  await user.click(combobox);
  await user.click(await screen.findByRole("option", { name: option }));
}

describe("TransactionFilterBar — type and category stay in sync (#163)", () => {
  it("lists only the selected type's categories", async () => {
    renderFilterBar({ type: "income" });

    await userEvent.setup().click(categorySelect());

    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Salary")).toBeInTheDocument();
    expect(within(listbox).queryByText("Food & Drinks")).not.toBeInTheDocument();
  });

  it("lists every category grouped by type when Type is All", async () => {
    renderFilterBar();

    await userEvent.setup().click(categorySelect());

    expect(await screen.findByRole("group", { name: "Expense" })).toHaveTextContent("Food & Drinks");
    expect(screen.getByRole("group", { name: "Income" })).toHaveTextContent("Salary");
  });

  it("clears a category of the other type when Type changes", async () => {
    const { lastValue } = renderFilterBar({ type: "expense", categoryId: "c-food" });

    await pick(typeSelect(), "Income");

    expect(lastValue()).toMatchObject({ type: "income", categoryId: undefined });
  });

  it("keeps a category that matches the new Type", async () => {
    const { lastValue } = renderFilterBar({ categoryId: "c-food" });

    await pick(typeSelect(), "Expense");

    expect(lastValue()).toMatchObject({ type: "expense", categoryId: "c-food" });
  });

  it("keeps the category when Type goes back to All", async () => {
    const { lastValue } = renderFilterBar({ type: "expense", categoryId: "c-food" });

    await pick(typeSelect(), "All Types");

    expect(lastValue()).toMatchObject({ type: undefined, categoryId: "c-food" });
  });

  it("switches Type from All to the picked category's type", async () => {
    const { onValueChange, lastValue } = renderFilterBar();

    await pick(categorySelect(), "Salary");

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(lastValue()).toMatchObject({ type: "income", categoryId: "c-salary" });
  });

  it("leaves Type alone when All categories is picked", async () => {
    const { lastValue } = renderFilterBar({ type: "expense", categoryId: "c-food" });

    await pick(categorySelect(), "All categories");

    expect(lastValue()).toMatchObject({ type: "expense", categoryId: undefined });
  });
});
