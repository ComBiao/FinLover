import type { LucideIcon } from "lucide-react";

export type WalletType = "cash" | "bank" | "savings" | "credit";

export type Wallet = {
  id: string;
  name: string;
  /** Derived client-side from `isSaving` (see `mapWalletRecord`); the server does not store a wallet type. */
  type?: WalletType;
  balance: number;
  icon: LucideIcon;
  /** Optional custom color from the API (hex like "#f0c48a" or a Tailwind class string). */
  color?: string;
  /** Whether this wallet tracks a savings goal (Home's Total balance card only shows goal progress for a saving wallet). */
  isSaving?: boolean;
  /** Target amount for a saving wallet; `null`/absent means no goal is set. */
  savingGoal?: number | null;
  /** Goal amount matching backend API property name. */
  goalAmount?: number | null;
  /** Whether this is the user's default wallet. */
  isDefault?: boolean;
};
