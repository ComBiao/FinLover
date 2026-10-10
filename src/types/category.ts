import type { LucideIcon } from "lucide-react";

import type { CategoryIcon } from "@/shared/contracts";

export type TransactionType = "income" | "expense";

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
  icon: LucideIcon;
  /** The API icon name behind `icon`; lets the edit form preselect it. */
  iconName?: CategoryIcon;
  /** System defaults seeded at registration — read-only on the server. */
  isSystem?: boolean;
  /** Optional custom color from the API (hex like "#f0c48a" or a Tailwind class string). Mirrors `ICategory.color` in `src/models/Category.ts`. */
  color?: string;
};
