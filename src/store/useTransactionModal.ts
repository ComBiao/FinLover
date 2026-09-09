import { create } from "zustand";

import type { TransactionType } from "@/types/category";
import type { Transaction } from "@/types/transaction";

type TransactionModalState = {
  isOpen: boolean;
  defaultType: TransactionType;
  /** Set when the modal was opened via "Edit" on an existing row; `null` means Add mode. */
  editingTransaction: Transaction | null;
  openModal: (defaultType?: TransactionType) => void;
  openEditModal: (transaction: Transaction) => void;
  closeModal: () => void;
};

/**
 * Controls the open/close state of the Add/Edit Transaction modal, which
 * transaction type (income/expense) it should default to when opened, and
 * (in edit mode) which existing transaction it should be populated from.
 */
export const useTransactionModal = create<TransactionModalState>((set) => ({
  isOpen: false,
  defaultType: "expense",
  editingTransaction: null,
  openModal: (defaultType = "expense") =>
    set({ isOpen: true, defaultType, editingTransaction: null }),
  openEditModal: (transaction) =>
    set({ isOpen: true, defaultType: transaction.type, editingTransaction: transaction }),
  closeModal: () => set({ isOpen: false, editingTransaction: null }),
}));
