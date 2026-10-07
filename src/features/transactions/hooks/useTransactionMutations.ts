import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/features/transactions/transactionsService";
import type { Transaction } from "@/types/transaction";

/**
 * Refetches everything derived from the transaction list after a mutation:
 * the shared transaction list itself, wallet balances (mutated as a side
 * effect of the create/update/delete), and Home's per-month summary.
 * "home-summary" is kept as a plain string here (matching the query-key
 * prefix `useHomeSummary` uses) rather than an imported constant, so this
 * transactions-feature file doesn't need to import from the homepage
 * feature.
 */
function invalidateDerivedQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["transactions"] });
  queryClient.invalidateQueries({ queryKey: ["wallets"] });
  queryClient.invalidateQueries({ queryKey: ["home-summary"] });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<Transaction, "id">) => createTransaction(input),
    onSuccess: () => invalidateDerivedQueries(queryClient),
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Omit<Transaction, "id"> }) =>
      updateTransaction(id, input),
    onSuccess: () => invalidateDerivedQueries(queryClient),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => invalidateDerivedQueries(queryClient),
  });
}
