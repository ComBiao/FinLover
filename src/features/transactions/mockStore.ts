import { MOCK_CATEGORIES } from "@/mocks/mockCategories";
import { MOCK_WALLETS } from "@/mocks/mockWallets";
import type { Wallet } from "@/types/wallet";

/**
 * Mock wallet/category data still backing walletsService.ts and
 * categoriesService.ts. Transactions are real (see transactionsService.ts).
 * Delete this file when both of those services call the API.
 */
const wallets: Wallet[] = MOCK_WALLETS.map((wallet) => ({ ...wallet }));

export function readWallets(): Wallet[] {
  return wallets;
}

export function readCategories() {
  return MOCK_CATEGORIES;
}
