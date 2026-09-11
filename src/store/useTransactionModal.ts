import { create } from "zustand";

import type { TransactionType } from "@/types/category";

type TransactionModalState = {
  isOpen: boolean;
  defaultType: TransactionType;
  openModal: (defaultType?: TransactionType) => void;
  closeModal: () => void;
};

/**
 * Controls the open/close state of the Add Transaction modal, along with
 * which transaction type (income/expense) it should default to when opened.
 */
export const useTransactionModal = create<TransactionModalState>((set) => ({
  isOpen: false,
  defaultType: "expense",
  openModal: (defaultType = "expense") => set({ isOpen: true, defaultType }),
  closeModal: () => set({ isOpen: false }),
}));
