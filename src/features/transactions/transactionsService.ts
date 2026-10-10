import type { Transaction } from "@/types/transaction";

import { delay } from "./mockDelay";
import {
  applyCreateTransaction,
  applyDeleteTransaction,
  applyUpdateTransaction,
  readTransactions,
} from "./mockStore";

// TODO(backend): replace with fetch('/api/v1/transactions?month=YYYY-MM')
export function getTransactions(): Promise<Transaction[]> {
  return delay(readTransactions());
}

// TODO(backend): replace with POST /api/v1/transactions
export function createTransaction(input: Omit<Transaction, "id">): Promise<Transaction> {
  return delay(applyCreateTransaction(input));
}

// TODO(backend): replace with PUT /api/v1/transactions/:id
export function updateTransaction(
  id: string,
  input: Omit<Transaction, "id">
): Promise<Transaction> {
  return delay(applyUpdateTransaction(id, input));
}

// TODO(backend): replace with DELETE /api/v1/transactions/:id
export function deleteTransaction(id: string): Promise<void> {
  return delay(applyDeleteTransaction(id));
}
