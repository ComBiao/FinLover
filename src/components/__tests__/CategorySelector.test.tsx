// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { CategorySelector } from "../CategorySelector";
import { toCategory } from "@/features/categories/categoriesService";

const CATEGORIES = [
  toCategory({ id: "c-food", name: "Food & Drinks", type: "expense", icon: "Utensils", isSystem: true }),
  toCategory({ id: "c-others-exp", name: "Others", type: "expense", icon: "MoreHorizontal", isSystem: true }),
  toCategory({ id: "c-salary", name: "Salary", type: "income", icon: "Wallet", isSystem: true }),
  toCategory({ id: "c-others-inc", name: "Others", type: "income", icon: "MoreHorizontal", isSystem: true }),
];

afterEach(() => cleanup());

describe("CategorySelector — income vs expense (#140)", () => {
  it("groups the options under Expense and Income headings", async () => {
    render(<CategorySelector categories={CATEGORIES} allowAll />);

    fireEvent.click(screen.getByRole("combobox"));

    const expenseGroup = await screen.findByRole("group", { name: "Expense" });
    const incomeGroup = screen.getByRole("group", { name: "Income" });
    expect(expenseGroup).toHaveTextContent("Food & Drinks");
    expect(expenseGroup).toHaveTextContent("Others");
    expect(expenseGroup).not.toHaveTextContent("Salary");
    expect(incomeGroup).toHaveTextContent("Salary");
    expect(incomeGroup).toHaveTextContent("Others");
  });

  it("names the type on the trigger when the picked name exists in both types", () => {
    const { rerender } = render(<CategorySelector categories={CATEGORIES} allowAll value="c-others-inc" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Others· Income");

    rerender(<CategorySelector categories={CATEGORIES} allowAll value="c-salary" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Salary");
    expect(screen.getByRole("combobox")).not.toHaveTextContent("Income");
  });

  it("keeps a flat list when narrowed to one type", async () => {
    render(<CategorySelector categories={CATEGORIES} type="expense" />);

    fireEvent.click(screen.getByRole("combobox"));

    await screen.findByText("Food & Drinks");
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.queryByText("Salary")).not.toBeInTheDocument();
  });
});
