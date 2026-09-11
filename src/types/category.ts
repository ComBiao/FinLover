import type { LucideIcon } from "lucide-react";

export type TransactionType = "income" | "expense";

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
  icon: LucideIcon;
  /** Optional custom color from the API (hex like "#f0c48a" or a Tailwind class string). Mirrors `ICategory.color` in `src/models/Category.ts`. */
  color?: string;
};
