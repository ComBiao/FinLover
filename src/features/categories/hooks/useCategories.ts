import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/features/categories/categoriesService";
import type { TransactionType } from "@/types/category";

export const CATEGORIES_QUERY_KEY = ["categories"] as const;

/** All of the signed-in user's categories (system defaults + custom), optionally narrowed by type. */
export function useCategories(type?: TransactionType) {
  return useQuery({
    queryKey: type ? [...CATEGORIES_QUERY_KEY, type] : CATEGORIES_QUERY_KEY,
    queryFn: () => getCategories(type),
  });
}

/**
 * Deleting a category clears it from its transactions (balances untouched) and
 * Home's top-categories card is derived from it, so those caches go stale too.
 * "home-summary" stays a plain string to match `useHomeSummary`'s key prefix.
 */
function invalidateCategoryQueries(queryClient: QueryClient, { alsoDerived }: { alsoDerived: boolean }) {
  queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
  if (alsoDerived) {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["home-summary"] });
  }
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(input),
    onSuccess: () => invalidateCategoryQueries(queryClient, { alsoDerived: false }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) => updateCategory(id, input),
    onSuccess: () => invalidateCategoryQueries(queryClient, { alsoDerived: true }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => invalidateCategoryQueries(queryClient, { alsoDerived: true }),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Couldn't delete category");
    },
  });
}
