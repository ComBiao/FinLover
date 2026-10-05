import { useState } from "react";

export type CategoryType = "expense" | "income";

export interface Category {
  id: number;
  name: string;
  iconName: string;
  color: string;
  isDefault?: boolean;
  isFallback?: boolean;
}

function otherLast(categories: Category[]) {
  return [...categories].sort((a, b) => Number(Boolean(a.isFallback)) - Number(Boolean(b.isFallback)));
}

export function useCategories(initialExpenses: Category[], initialIncomes: Category[]) {
  const [expenses, setExpenses] = useState<Category[]>(() => otherLast(initialExpenses));
  const [incomes, setIncomes] = useState<Category[]>(() => otherLast(initialIncomes));

  const deleteCategory = (type: CategoryType, id: number) => {
    if (type === "expense") {
      setExpenses((prev) => prev.filter((cat) => cat.id !== id || cat.isDefault));
    } else {
      setIncomes((prev) => prev.filter((cat) => cat.id !== id || cat.isDefault));
    }
  };

  const editCategory = (type: CategoryType, id: number, updatedData: Pick<Category, "name" | "iconName" | "color">) => {
    if (type === "expense") {
      setExpenses((prev) =>
        prev.map((cat) => (cat.id === id && !cat.isDefault ? { ...cat, ...updatedData } : cat))
      );
    } else {
      setIncomes((prev) =>
        prev.map((cat) => (cat.id === id && !cat.isDefault ? { ...cat, ...updatedData } : cat))
      );
    }
  };

  const addCategory = (type: CategoryType, category: Category) => {
    if (type === "expense") {
      setExpenses((prev) => otherLast([...prev, category]));
    } else {
      setIncomes((prev) => otherLast([...prev, category]));
    }
  };

  return {
    expenses,
    incomes,
    deleteCategory,
    editCategory,
    addCategory,
  };
}
