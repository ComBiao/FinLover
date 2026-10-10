"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchWallets, type WalletDTO } from "@/features/wallets/walletService";

export const WALLETS_QUERY_KEY = ["wallets"] as const;

/**
 * TanStack Query hook that fetches the authenticated user's wallets from
 * `GET /api/v1/wallets`. Shared across every page via a single cache entry
 * keyed by `["wallets"]`.
 *
 * Returns the API contract (`WalletDTO[]`). Map with `toWallets` when a UI
 * `Wallet` (icon, `savingGoal`) is needed. Pass this hook to screens that
 * still own their own `WalletSelector` wiring.
 */
export function useWallets() {
  return useQuery<WalletDTO[]>({
    queryKey: WALLETS_QUERY_KEY,
    queryFn: fetchWallets,
  });
}
