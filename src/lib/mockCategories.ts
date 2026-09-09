import {
  Banknote,
  Briefcase,
  Car,
  Gift,
  Landmark,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";

import type { Category } from "@/types/category";

// TODO: replace with categories fetched from /api/categories via react-query.
export const MOCK_CATEGORIES: Category[] = [
  { id: "food-drink", name: "Food & Drink", type: "expense", icon: UtensilsCrossed },
  { id: "transport", name: "Transport", type: "expense", icon: Car },
  { id: "shopping", name: "Shopping", type: "expense", icon: ShoppingBag },
  { id: "gifts", name: "Gifts", type: "expense", icon: Gift },
  { id: "salary", name: "Salary", type: "income", icon: Banknote },
  { id: "freelance", name: "Freelance", type: "income", icon: Briefcase },
  { id: "investment", name: "Investment", type: "income", icon: Landmark },
];
