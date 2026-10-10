"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  resolveActiveWalletId,
  selectWallet,
  type WalletRef,
} from "../resolveActiveWallet";

export const ACTIVE_WALLET_STORAGE_KEY = "finlover-active-wallet";

export type ActiveWalletState = {
  /** The selected wallet's id, or null if no wallet is selected. */
  walletId: string | null;
  /** Set the wallet id directly without validation. */
  setWalletId: (id: string | null) => void;
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

export const useActiveWallet = create<ActiveWalletState>()(
  persist(
    (set, get) => ({
      walletId: null,
      setWalletId: (id) => set({ walletId: id }),
      selectWallet: (id, availableWallets) => {
        const currentId = get().walletId;
        const result = selectWallet(id, currentId, availableWallets);
        if (result.accepted) {
          set({ walletId: result.selectedId });
          return true;
        }
        return false;
      },
      resolveFallback: (availableWallets) => {
        const currentId = get().walletId;
        const resolvedId = resolveActiveWalletId(currentId, availableWallets);
        if (resolvedId !== currentId) {
          set({ walletId: resolvedId });
        }
        return resolvedId;
      },
      clear: () => {
        set({ walletId: null });
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
      partialize: (state) => ({ walletId: state.walletId }),
    }
  )
);
