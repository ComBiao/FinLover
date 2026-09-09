import type { LucideIcon } from "lucide-react";

export type WalletType = "cash" | "bank" | "savings" | "credit";

export type Wallet = {
  id: string;
  name: string;
  type: WalletType;
  balance: number;
  icon: LucideIcon;
};
