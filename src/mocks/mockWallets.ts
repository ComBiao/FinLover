import { CreditCard, Landmark, PiggyBank, Wallet as WalletIcon } from "lucide-react";

import type { Wallet } from "@/types/wallet";

// TODO: replace with wallets fetched from /api/wallets via react-query.
export const MOCK_WALLETS: Wallet[] = [
  { id: "cash", name: "Cash", type: "cash", balance: 2500, icon: WalletIcon },
  { id: "kbank-savings", name: "KBank Savings", type: "savings", balance: 45200, icon: PiggyBank },
  { id: "scb-checking", name: "SCB Checking", type: "bank", balance: 18750, icon: Landmark },
  { id: "credit-card", name: "Credit Card", type: "credit", balance: -3200, icon: CreditCard },
];
