import { describe, expect, it } from "vitest";

import { toCategory } from "@/features/categories/categoriesService";
import { filterTransactions, withFallbackCategory } from "../transactions";
import { DEFAULT_TRANSACTION_FILTERS, type Transaction } from "@/types/transaction";

const CATEGORIES = [
  toCategory({ id: "c-food", name: "Food & Drinks", type: "expense", icon: "Utensils", isSystem: true }),
  toCategory({ id: "c-others-exp", name: "Others", type: "expense", icon: "MoreHorizontal", isSystem: true }),
  toCategory({ id: "c-others-inc", name: "Others", type: "income", icon: "MoreHorizontal", isSystem: true }),
  toCategory({ id: "c-custom-others", name: "Others", type: "expense", icon: "Star", isSystem: false }),
];

const tx = (id: string, type: Transaction["type"], categoryId?: string): Transaction => ({
  id,
  title: id,
  amount: 10,
  type,
  walletId: "w1",
  categoryId,
  date: new Date(2026, 9, 5),
});

describe("withFallbackCategory (#140)", () => {
  it("assigns category-less rows to their type's seeded Others and keeps the rest", () => {
    const result = withFallbackCategory(
      [tx("a", "expense"), tx("b", "income"), tx("c", "expense", "c-food")],
      CATEGORIES
    );

    expect(result.map((t) => t.categoryId)).toEqual(["c-others-exp", "c-others-inc", "c-food"]);
  });

  it("ignores a user-made category named Others", () => {
    const [result] = withFallbackCategory([tx("a", "expense")], CATEGORIES.filter((c) => c.id !== "c-others-exp"));

    expect(result.categoryId).toBeUndefined();
  });

  it("lets the category filter find category-less rows under Others", () => {
    const rows = withFallbackCategory([tx("a", "expense"), tx("b", "expense", "c-others-exp"), tx("c", "income")], CATEGORIES);

    const filtered = filterTransactions(rows, { ...DEFAULT_TRANSACTION_FILTERS, categoryId: "c-others-exp" });

    expect(filtered.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });
});
