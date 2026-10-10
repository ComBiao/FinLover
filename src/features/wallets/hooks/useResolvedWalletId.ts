"use client";

import { useEffect, useMemo } from "react";

import { resolveActiveWalletId } from "../resolveActiveWallet";
import { useActiveWallet } from "../store/useActiveWallet";
import { useWallets } from "./useWallets";

/**
 * Composite hook that resolves the persisted wallet id against the live wallet list.
 *
 * Provides:
 * - `walletId`: The validated wallet id (falls back to default wallet, then first wallet).
 * - `activeWallet`: The full WalletDTO object for the active wallet.
 * - `wallets`: The full array of fetched wallets.
 * - `selectWallet`: Validates and switches the active wallet (rejects invalid/unauthorized ids).
 * - `clear`: Clears the active wallet state.
 */
export function useResolvedWalletId() {
  const { data: wallets, isPending, isError, error, refetch } = useWallets();
  const walletId = useActiveWallet((state) => state.walletId);
  const selectWallet = useActiveWallet((state) => state.selectWallet);
  const resolveFallback = useActiveWallet((state) => state.resolveFallback);
  const clear = useActiveWallet((state) => state.clear);

  // Compute resolved wallet id
  const activeWalletId = useMemo(() => {
    return resolveActiveWalletId(walletId, wallets);
  }, [walletId, wallets]);

  // Keep store in sync if fallback was triggered once wallets load
  useEffect(() => {
    if (wallets && wallets.length > 0) {
      resolveFallback(wallets);
    }
  }, [wallets, resolveFallback]);

  const activeWallet = useMemo(() => {
    if (!wallets || !activeWalletId) return undefined;
    return wallets.find((w) => w.id === activeWalletId);
  }, [wallets, activeWalletId]);

  return {
    walletId: activeWalletId,
    activeWallet,
    wallets: wallets ?? [],
    isPending,
    isError,
    error,
    refetch,
    selectWallet: (id: string) => selectWallet(id, wallets),
    clear,
  };
}
