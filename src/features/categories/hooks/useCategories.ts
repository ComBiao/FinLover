import { useState } from "react";

export type CategoryType = "expense" | "income";

export interface Category {
  id: number;
  name: string;
  iconName: string;
  color: string;
}

export function useCategories(initialExpenses: Category[], initialIncomes: Category[]) {
  const [expenses, setExpenses] = useState<Category[]>(initialExpenses);
  const [incomes, setIncomes] = useState<Category[]>(initialIncomes);

  const deleteCategory = (type: CategoryType, id: number) => {
    if (type === "expense") {
      setExpenses((prev) => prev.filter((cat) => cat.id !== id));
    } else {
      setIncomes((prev) => prev.filter((cat) => cat.id !== id));
    }
  };

  const editCategory = (type: CategoryType, id: number, updatedData: Omit<Category, "id">) => {
    if (type === "expense") {
      setExpenses((prev) =>
        prev.map((cat) => (cat.id === id ? { ...cat, ...updatedData } : cat))
      );
    } else {
      setIncomes((prev) =>
        prev.map((cat) => (cat.id === id ? { ...cat, ...updatedData } : cat))
      );
    }
  };

  const addCategory = (type: CategoryType, category: Category) => {
    if (type === "expense") {
      setExpenses((prev) => [...prev, category]);
    } else {
      setIncomes((prev) => [...prev, category]);
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
