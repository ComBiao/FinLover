import { Plane, PiggyBank, Wallet as WalletIcon } from "lucide-react";

import type { Wallet } from "@/types/wallet";

// TODO: replace with wallets fetched from /api/wallets via react-query.
export const MOCK_WALLETS: Wallet[] = [
  { id: "daily", name: "Daily", type: "cash", balance: 27390, icon: WalletIcon, color: "#E3B15C" },
  {
    id: "emergency-fund",
    name: "Emergency fund",
    type: "savings",
    balance: 12400,
    icon: PiggyBank,
    color: "#4E9466",
    isSaving: true,
    savingGoal: 20000,
  },
  {
    id: "japan-trip",
    name: "Japan trip",
    type: "savings",
    balance: 8500,
    icon: Plane,
    color: "#8B7CF6",
    isSaving: true,
    savingGoal: 30000,
  },
];
