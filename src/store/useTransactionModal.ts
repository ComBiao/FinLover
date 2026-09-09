import { create } from "zustand";

import type { TransactionType } from "@/types/category";
import type { Transaction } from "@/types/transaction";

type TransactionModalState = {
  isOpen: boolean;
  defaultType: TransactionType;
  /** Set when the modal was opened via "Edit" on an existing row; `null` means Add mode. */
  editingTransaction: Transaction | null;
  /** Row awaiting delete confirmation; `null` means the delete dialog is closed. */
  deletingTransaction: Transaction | null;
  openModal: (defaultType?: TransactionType) => void;
  openEditModal: (transaction: Transaction) => void;
  closeModal: () => void;
  openDeleteModal: (transaction: Transaction) => void;
  closeDeleteModal: () => void;
};

/**
 * Controls the open/close state of the Add/Edit Transaction modal (which
 * type it should default to, and — in edit mode — which existing
 * transaction to populate from) and the Delete confirmation dialog. Both
 * live in one store so either modal can trigger the other — e.g. the Edit
 * modal's "Delete" button closes itself and opens the delete confirmation.
 */
export const useTransactionModal = create<TransactionModalState>((set) => ({
  isOpen: false,
  defaultType: "expense",
  editingTransaction: null,
  deletingTransaction: null,
  openModal: (defaultType = "expense") =>
    set({ isOpen: true, defaultType, editingTransaction: null }),
  openEditModal: (transaction) =>
    set({ isOpen: true, defaultType: transaction.type, editingTransaction: transaction }),
  closeModal: () => set({ isOpen: false, editingTransaction: null }),
  openDeleteModal: (transaction) => set({ isOpen: false, deletingTransaction: transaction }),
  closeDeleteModal: () => set({ deletingTransaction: null }),
}));
