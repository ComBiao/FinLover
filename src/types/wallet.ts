import type { LucideIcon } from "lucide-react";

export type WalletType = "cash" | "bank" | "savings" | "credit";

export type Wallet = {
  id: string;
  name: string;
  type: WalletType;
  balance: number;
  icon: LucideIcon;
  /** Optional custom color from the API (hex like "#f0c48a" or a Tailwind class string). Not in `IWallet` yet (`src/models/Wallet.ts`) — reserved for when the backend adds it. */
  color?: string;
};
