import { PiggyBank, Wallet as WalletIcon } from "lucide-react";

import type { Wallet } from "@/types/wallet";
import type { WalletDTO } from "@/features/wallets/walletService";

/**
 * Maps a raw `WalletDTO` (from the API) to the frontend `Wallet` type that
 * UI components like `WalletDropdown` and `WalletSelector` expect.
 *
 * The API doesn't return an icon or a `type` — those were mock-data-only
 * fields. This mapper assigns sensible defaults:
 *
 * - `icon`: PiggyBank for saving wallets, WalletIcon for daily wallets
 * - `type`: omitted (optional on `Wallet`)
 * - `savingGoal`: mapped from `goalAmount`
 */
export function toWallet(dto: WalletDTO): Wallet {
  return {
    id: dto.id,
    name: dto.name,
    balance: dto.balance,
    icon: dto.isSaving ? PiggyBank : WalletIcon,
    color: dto.color,
    isSaving: dto.isSaving,
    savingGoal: dto.goalAmount,
  };
}

/** Maps an array of `WalletDTO` to `Wallet[]`. */
export function toWallets(dtos: WalletDTO[]): Wallet[] {
  return dtos.map(toWallet);
}

