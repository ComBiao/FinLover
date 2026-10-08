import type { TransactionType } from "@/types/category";
import type { Transaction } from "@/types/transaction";

import {
  applyCreateTransaction,
  applyDeleteTransaction,
  applyUpdateTransaction,
  readCategories,
  readTransactions,
  readWallets,
} from "./mockStore";

const MOCK_DELAY_MS = 200;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_DELAY_MS));
}

// TODO(backend): replace with fetch('/api/transactions')
export function getTransactions(): Promise<Transaction[]> {
  return delay(readTransactions());
}

// TODO(backend): replace with fetch('/api/wallets')
export function getWallets() {
  return delay(readWallets());
}

// TODO(backend): replace with fetch('/api/categories?type=...')
export function getCategories(type?: TransactionType) {
  const categories = readCategories();
  return delay(type ? categories.filter((category) => category.type === type) : categories);
}

// TODO(backend): replace with POST /api/transactions
export function createTransaction(input: Omit<Transaction, "id">): Promise<Transaction> {
  return delay(applyCreateTransaction(input));
}

// TODO(backend): replace with PATCH /api/transactions/:id
export function updateTransaction(
  id: string,
  input: Omit<Transaction, "id">
): Promise<Transaction> {
  return delay(applyUpdateTransaction(id, input));
}

// TODO(backend): replace with DELETE /api/transactions/:id
export function deleteTransaction(id: string): Promise<void> {
  return delay(applyDeleteTransaction(id));
}
