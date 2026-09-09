import type { Wallet } from "@/types/wallet";

// TODO: replace with wallets fetched from /api/wallets via react-query.
export const MOCK_WALLETS: Wallet[] = [
  { id: "cash", name: "Cash", balance: 2500, icon: "wallet", isDefault: true },
  { id: "kbank-savings", name: "KBank Savings", balance: 45200, icon: "piggy-bank" },
  { id: "scb-checking", name: "SCB Checking", balance: 18750, icon: "landmark" },
  { id: "credit-card", name: "Credit Card", balance: -3200, icon: "credit-card" },
];
