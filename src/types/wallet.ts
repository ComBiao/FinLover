export type Wallet = {
  id: string;
  name: string;
  balance: number;
  /** Icon key from the backend (e.g. "wallet", "credit-card"), resolved to a `LucideIcon` component via `resolveWalletIcon` — never store a component reference here, since this shape is meant to round-trip through the API as plain JSON. */
  icon: string;
  isDefault?: boolean;
  /** Optional custom color from the API (hex like "#f0c48a" or a Tailwind class string). Not in `IWallet` yet (`src/models/Wallet.ts`) — reserved for when the backend adds it. */
  color?: string;
};
