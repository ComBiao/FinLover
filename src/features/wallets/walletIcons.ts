import {
  Wallet,
  CreditCard,
  Banknote,
  Landmark,
  Coins,
  PiggyBank,
  CircleDollarSign,
  Gem,
  Briefcase,
  ShoppingBag,
  Plane,
  ShieldCheck,
  Receipt,
  type LucideIcon,
} from "lucide-react";

export type WalletIconOption = {
  name: string;
  label: string;
  icon: LucideIcon;
};

export const WALLET_ICON_OPTIONS: WalletIconOption[] = [
  { name: "Wallet", label: "Wallet", icon: Wallet },
  { name: "Banknote", label: "Cash", icon: Banknote },
  { name: "CreditCard", label: "Card", icon: CreditCard },
  { name: "Landmark", label: "Bank", icon: Landmark },
  { name: "Coins", label: "Coins", icon: Coins },
  { name: "PiggyBank", label: "Savings", icon: PiggyBank },
  { name: "CircleDollarSign", label: "Funds", icon: CircleDollarSign },
  { name: "Gem", label: "Invest", icon: Gem },
  { name: "Briefcase", label: "Business", icon: Briefcase },
  { name: "ShoppingBag", label: "Shopping", icon: ShoppingBag },
  { name: "Plane", label: "Travel", icon: Plane },
  { name: "ShieldCheck", label: "Emergency", icon: ShieldCheck },
  { name: "Receipt", label: "Bills", icon: Receipt },
];

export const WALLET_ICONS: Record<string, LucideIcon> = Object.fromEntries(
  WALLET_ICON_OPTIONS.map((item) => [item.name, item.icon])
);

export function resolveWalletIcon(name?: string | null, isSaving?: boolean): LucideIcon {
  if (name && WALLET_ICONS[name]) {
    return WALLET_ICONS[name];
  }
  return isSaving ? PiggyBank : Wallet;
}
