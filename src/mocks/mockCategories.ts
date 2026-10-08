import {
  Banknote,
  Briefcase,
  Car,
  PiggyBank,
  ShoppingBag,
  UtensilsCrossed,
  Zap,
} from "lucide-react";

import type { Category } from "@/types/category";

// TODO: replace with categories fetched from /api/categories via react-query.
export const MOCK_CATEGORIES: Category[] = [
  { id: "food-drink", name: "Food & drink", type: "expense", icon: UtensilsCrossed },
  { id: "transport", name: "Transport", type: "expense", icon: Car },
  { id: "shopping", name: "Shopping", type: "expense", icon: ShoppingBag },
  { id: "bills", name: "Bills", type: "expense", icon: Zap },
  { id: "salary", name: "Salary", type: "income", icon: Banknote },
  { id: "freelance", name: "Freelance", type: "income", icon: Briefcase },
  { id: "saving", name: "Saving", type: "income", icon: PiggyBank },
];
