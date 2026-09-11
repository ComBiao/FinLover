import { CreditCard, Landmark, PiggyBank, Wallet as WalletIcon, type LucideIcon } from "lucide-react";

/**
 * Maps the string icon key the backend sends for a wallet (e.g. "wallet",
 * "credit-card") to the actual `lucide-react` component. Backend data can
 * only ever carry a serializable key, never a component reference, so
 * `Wallet.icon` is typed as `string` and resolved through this map at render
 * time instead of being stored as a `LucideIcon` directly.
 */
const WALLET_ICON_MAP: Record<string, LucideIcon> = {
  wallet: WalletIcon,
  "piggy-bank": PiggyBank,
  landmark: Landmark,
  "credit-card": CreditCard,
};

/** Generic fallback for an icon key the map doesn't (yet) recognize. */
const DEFAULT_WALLET_ICON: LucideIcon = WalletIcon;

/** Resolves a wallet's icon key to its `LucideIcon` component, falling back to a generic wallet icon for an unknown/missing key. */
export function resolveWalletIcon(iconKey: string | undefined): LucideIcon {
  return (iconKey && WALLET_ICON_MAP[iconKey]) || DEFAULT_WALLET_ICON;
}
