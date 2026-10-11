import { create } from "zustand";

export type BalanceVisibilityState = {
  isVisible: boolean;
  toggle: () => void;
  hide: () => void;
  show: () => void;
  /** Reverts visibility to hidden when an error occurs. */
  onError: () => void;
};

/**
 * Client-side state for hiding/showing sensitive balance numbers (#78).
 * Defaults to visible, toggles with the eye icon, and reverts to hidden on error.
 */
export const useBalanceVisibility = create<BalanceVisibilityState>((set) => ({
  isVisible: true,
  toggle: () => set((state) => ({ isVisible: !state.isVisible })),
  hide: () => set({ isVisible: false }),
  show: () => set({ isVisible: true }),
  onError: () => set({ isVisible: false }),
}));

