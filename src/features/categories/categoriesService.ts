import { deleteApi, getApi, postApi, putApi } from "@/lib/api/client";
import type { CategoryIcon } from "@/shared/contracts";
import type { Category, TransactionType } from "@/types/category";

import { resolveCategoryIcon } from "./categoryIcons";

/** One row of `GET /api/v1/categories` (see `categoryResponse` in `@/shared/contracts`). */
type CategoryDto = {
  id: string;
  name: string;
  type: TransactionType;
  color?: string;
  icon?: CategoryIcon;
  isSystem: boolean;
};

export type CreateCategoryInput = {
  name: string;
  type: TransactionType;
  color?: string;
  icon?: CategoryIcon;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

/** Name of the per-type catch-all the server seeds at registration; the Category page keeps it last. */
export const FALLBACK_CATEGORY_NAME = "Others";

export function toCategory(dto: CategoryDto): Category {
  return {
    id: dto.id,
    name: dto.name,
    type: dto.type,
    icon: resolveCategoryIcon(dto.icon),
    iconName: dto.icon,
    color: dto.color,
    isSystem: dto.isSystem,
  };
}

export async function getCategories(type?: TransactionType): Promise<Category[]> {
  const rows = await getApi<CategoryDto[]>(`/api/v1/categories${type ? `?type=${type}` : ""}`);
  return rows.map(toCategory);
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  return toCategory(await postApi<CategoryDto>("/api/v1/categories", input));
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
  return toCategory(await putApi<CategoryDto>(`/api/v1/categories/${id}`, input));
}

export function deleteCategory(id: string): Promise<void> {
  return deleteApi(`/api/v1/categories/${id}`);
}
