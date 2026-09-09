import type { LucideIcon } from "lucide-react";

export type TransactionType = "income" | "expense";

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
  icon: LucideIcon;
};
