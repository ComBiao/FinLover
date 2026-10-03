import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { postApi } from "@/lib/api/client";
import { categoryInput, categoryResponse } from "@/shared/contracts";
import type { z } from "zod";

export type CategoryType = "expense" | "income";

export interface Category {
  /**
   * String (Mongo ObjectId) once persisted via `POST /api/v1/categories`.
   * Categories not yet wired to the API (edit/delete — see #103/#105) still
   * seed from `initialExpenses`/`initialIncomes`, whose ids are plain
   * numeric strings; both shapes satisfy `string`.
   */
  id: string;
  name: string;
  iconName: string;
  color: string;
}

/**
 * Body accepted by `POST /api/v1/categories` (US5-1). Deliberately omits
 * `iconName` — the API has no `icon` field yet (tracked in #96) — so the
 * icon the user picked stays client-side-only until then.
 */
type CreateCategoryInput = z.infer<typeof categoryInput>;
type CategoryResponse = z.infer<typeof categoryResponse>;

/**
 * `categoryInput.color` requires a `#rrggbb` hex string, but the picker in
 * `CategoryClient.tsx` offers Tailwind utility-class pairs (e.g.
 * `"bg-blue-100 text-blue-600"`) for direct use as a className — sending
 * one as-is fails the API's regex on every request. Translate to the
 * matching Tailwind-600 hex so the create succeeds; keep rendering from the
 * original class string locally (see `createCategory` below), since the
 * server doesn't understand the class form either. This mapping exists
 * only to bridge the gap — #59 (Category Entity data-contract rework) is
 * the right place to settle on one representation for good.
 */
const TAILWIND_SWATCH_TO_HEX: Record<string, string> = {
  "bg-blue-100 text-blue-600": "#2563eb",
  "bg-red-100 text-red-600": "#dc2626",
  "bg-green-100 text-green-600": "#16a34a",
  "bg-purple-100 text-purple-600": "#9333ea",
  "bg-orange-100 text-orange-600": "#ea580c",
  "bg-pink-100 text-pink-600": "#db2777",
  "bg-yellow-100 text-yellow-600": "#ca8a04",
  "bg-gray-100 text-gray-600": "#4b5563",
};

export function useCategories(initialExpenses: Category[], initialIncomes: Category[]) {
  const [expenses, setExpenses] = useState<Category[]>(initialExpenses);
  const [incomes, setIncomes] = useState<Category[]>(initialIncomes);

  const createMutation = useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      postApi<CategoryResponse>("/api/v1/categories", input),
  });

  const deleteCategory = (type: CategoryType, id: string) => {
    if (type === "expense") {
      setExpenses((prev) => prev.filter((cat) => cat.id !== id));
    } else {
      setIncomes((prev) => prev.filter((cat) => cat.id !== id));
    }
  };

  const editCategory = (type: CategoryType, id: string, updatedData: Omit<Category, "id">) => {
    if (type === "expense") {
      setExpenses((prev) =>
        prev.map((cat) => (cat.id === id ? { ...cat, ...updatedData } : cat))
      );
    } else {
      setIncomes((prev) =>
        prev.map((cat) => (cat.id === id ? { ...cat, ...updatedData } : cat))
      );
    }
  };

  /**
   * Creates the category via the real API, then appends the server's
   * response (authoritative `id`/`name`/`color`) to local state, keeping
   * only `iconName` sourced from the picker. Throws `ApiClientError` on
   * failure — callers decide how to surface it (see `CategoryClient.tsx`).
   *
   * There is no `GET /api/v1/categories` yet (US5-2 is unscoped — see
   * #101's Risk note), so a hard page refresh still reloads the hardcoded
   * `initialExpenses`/`initialIncomes` seed rather than this category. The
   * create itself is real and persisted; only the in-browser list is not
   * yet re-fetched from the server.
   */
  const createCategory = async (
    type: CategoryType,
    input: { name: string; iconName: string; color?: string }
  ) => {
    const created = await createMutation.mutateAsync({
      name: input.name,
      type,
      color: input.color ? TAILWIND_SWATCH_TO_HEX[input.color] : undefined,
    });

    // Render from the class string the user actually picked, not the hex
    // the server echoes back — the UI only knows how to paint the former.
    const category: Category = {
      id: created.id,
      name: created.name,
      iconName: input.iconName,
      color: input.color ?? "",
    };

    if (type === "expense") {
      setExpenses((prev) => [...prev, category]);
    } else {
      setIncomes((prev) => [...prev, category]);
    }

    return category;
  };

  return {
    expenses,
    incomes,
    deleteCategory,
    editCategory,
    createCategory,
    isCreating: createMutation.isPending,
  };
}
