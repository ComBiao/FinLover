"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { useTransactionFilters } from "@/features/transactions/store/useTransactionFilters";
import {
  resolveActiveWalletId,
  selectWallet,
  type WalletRef,
} from "../resolveActiveWallet";

export const ACTIVE_WALLET_STORAGE_KEY = "finlover-active-wallet";

export type ActiveWalletState = {
  /** The selected wallet's id, or null if no wallet is selected (or "all"). */
  walletId: string | null;
  /** The currently active wallet id, or "all" for the combined view (#77). */
  activeWalletId: string;
  /** Set the wallet id directly without validation. */
  setWalletId: (id: string | null) => void;
  /** Set active wallet id string ("all" or specific wallet id). */
  setActiveWalletId: (walletId: string) => void;
  /**
   * Select a wallet with validation against available wallets.
   * If the requested id is not in availableWallets, it is rejected
   * and the current wallet stays selected. Returns true if accepted, false if rejected.
   */
  selectWallet: (id: string, availableWallets?: WalletRef[]) => boolean;
  /**
   * Resolves the stored id against the given wallets list.
   * If the saved id no longer exists, falls back to the default wallet, then the first one.
   * Updates the store and returns the resolved id.
   */
  resolveFallback: (availableWallets: WalletRef[]) => string | null;
  /** Clear the active wallet selection (used on logout). */
  clear: () => void;
};

const memoryStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0,
};

function syncTransactionFilters(walletId: string | null) {
  try {
    const currentFilters = useTransactionFilters.getState().filters;
    const targetFilterWalletId = !walletId || walletId === "all" ? undefined : walletId;
    if (currentFilters.walletId !== targetFilterWalletId) {
      useTransactionFilters.getState().setFilters({
        ...currentFilters,
        walletId: targetFilterWalletId,
      });
    }
  } catch {
    // ignore in tests where useTransactionFilters may not be initialized
  }
}

export const useActiveWallet = create<ActiveWalletState>()(
  persist(
    (set, get) => ({
      walletId: null,
      activeWalletId: "all",
      setWalletId: (id: string | null) => {
        const normalizedId = !id || id === "all" ? null : id;
        const activeId = normalizedId ?? "all";
        set({ walletId: normalizedId, activeWalletId: activeId });
        syncTransactionFilters(normalizedId);
      },
      setActiveWalletId: (walletId: string) => {
        const normalizedId = !walletId || walletId === "all" ? null : walletId;
        set({ walletId: normalizedId, activeWalletId: walletId });
        syncTransactionFilters(normalizedId);
      },
      selectWallet: (id, availableWallets) => {
        const currentId = get().walletId;
        const result = selectWallet(id, currentId, availableWallets);
        if (result.accepted) {
          const activeId = result.selectedId ?? "all";
          set({ walletId: result.selectedId, activeWalletId: activeId });
          syncTransactionFilters(result.selectedId);
          return true;
        }
        return false;
      },
      resolveFallback: (availableWallets) => {
        const currentId = get().walletId;
        const resolvedId = resolveActiveWalletId(currentId, availableWallets);
        if (resolvedId !== currentId) {
          const activeId = resolvedId ?? "all";
          set({ walletId: resolvedId, activeWalletId: activeId });
          syncTransactionFilters(resolvedId);
        }
        return resolvedId;
      },
      clear: () => {
        set({ walletId: null, activeWalletId: "all" });
        syncTransactionFilters(null);
        try {
          if (typeof window !== "undefined") {
            localStorage.removeItem(ACTIVE_WALLET_STORAGE_KEY);
          }
        } catch {
          // ignore storage errors in non-browser environments
        }
      },
    }),
    {
      name: ACTIVE_WALLET_STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? memoryStorage : localStorage
      ),
      partialize: (state) => ({
        walletId: state.walletId,
        activeWalletId: state.activeWalletId,
      }),
    }
  )
);

// Listen to changes from useTransactionFilters so switching wallet from Transactions filters updates active wallet
if (typeof window !== "undefined") {
  try {
    useTransactionFilters.subscribe((state) => {
      const targetId = state.filters.walletId ?? "all";
      const currentActive = useActiveWallet.getState().activeWalletId;
      if (currentActive !== targetId) {
        useActiveWallet.setState({
          activeWalletId: targetId,
          walletId: targetId === "all" ? null : targetId,
        });
      }
    });
  } catch {
    // ignore
  }
}
