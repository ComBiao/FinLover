import { create } from "zustand";

import { useTransactionFilters } from "@/features/transactions/store/useTransactionFilters";

export type ActiveWalletState = {
  /** The currently active wallet id, or "all" for the combined view (#77). */
  activeWalletId: string;
  setActiveWalletId: (walletId: string) => void;
};

/**
 * Shared client state for switching the currently active wallet (#77).
 * Shared across the Home page and the Transactions page.
 */
export const useActiveWallet = create<ActiveWalletState>((set) => ({
  activeWalletId: useTransactionFilters.getState().filters.walletId ?? "all",
  setActiveWalletId: (walletId: string) => {
    set({ activeWalletId: walletId });

    // Keep Transactions page filters in sync (#77)
    const currentFilters = useTransactionFilters.getState().filters;
    const targetFilterWalletId = walletId === "all" ? undefined : walletId;
    if (currentFilters.walletId !== targetFilterWalletId) {
      useTransactionFilters.getState().setFilters({
        ...currentFilters,
        walletId: targetFilterWalletId,
      });
    }
  },
}));

// Listen to changes from useTransactionFilters so switching wallet from Transactions filters updates Home
if (typeof window !== "undefined") {
  useTransactionFilters.subscribe((state) => {
    const targetId = state.filters.walletId ?? "all";
    if (useActiveWallet.getState().activeWalletId !== targetId) {
      useActiveWallet.setState({ activeWalletId: targetId });
    }
  });
}

