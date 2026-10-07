import { MOCK_CATEGORIES } from "@/mocks/mockCategories";
import { MOCK_WALLETS } from "@/mocks/mockWallets";
import type { Transaction } from "@/types/transaction";
import type { Wallet } from "@/types/wallet";

import { MOCK_TRANSACTIONS } from "./mockTransactions";

/**
 * In-memory "database" backing the mock transactions/wallets/categories
 * service (./transactionsService.ts) — module-scoped state so every caller
 * (Home and Transactions page alike) reads and mutates the same data,
 * keeping both pages in sync without a real backend.
 */
let wallets: Wallet[] = MOCK_WALLETS.map((wallet) => ({ ...wallet }));
let transactions: Transaction[] = MOCK_TRANSACTIONS.map((transaction) => ({ ...transaction }));

/** Signed amount a transaction contributes to its wallet's balance. */
function signedAmount(type: Transaction["type"], amount: number) {
  return type === "income" ? amount : -amount;
}

function adjustWalletBalance(walletId: string, delta: number) {
  if (delta === 0) return;
  wallets = wallets.map((wallet) =>
    wallet.id === walletId ? { ...wallet, balance: wallet.balance + delta } : wallet
  );
}

export function readWallets(): Wallet[] {
  return wallets;
}

export function readTransactions(): Transaction[] {
  return transactions;
}

export function readCategories() {
  return MOCK_CATEGORIES;
}

export function applyCreateTransaction(input: Omit<Transaction, "id">): Transaction {
  const created: Transaction = { ...input, id: crypto.randomUUID() };
  transactions = [created, ...transactions];
  adjustWalletBalance(created.walletId, signedAmount(created.type, created.amount));
  return created;
}

export function applyUpdateTransaction(id: string, input: Omit<Transaction, "id">): Transaction {
  const previous = transactions.find((transaction) => transaction.id === id);
  if (!previous) {
    throw new Error(`Transaction "${id}" not found`);
  }

  const updated: Transaction = { ...input, id };
  transactions = transactions.map((transaction) => (transaction.id === id ? updated : transaction));

  // Reverse the old entry's effect and apply the new one — handles an amount
  // change, a type flip and a move to a different wallet in one pass (when
  // both wallets are the same, the two adjustments net against each other).
  adjustWalletBalance(previous.walletId, -signedAmount(previous.type, previous.amount));
  adjustWalletBalance(updated.walletId, signedAmount(updated.type, updated.amount));

  return updated;
}

export function applyDeleteTransaction(id: string): void {
  const removed = transactions.find((transaction) => transaction.id === id);
  if (!removed) return;

  transactions = transactions.filter((transaction) => transaction.id !== id);
  adjustWalletBalance(removed.walletId, -signedAmount(removed.type, removed.amount));
}
