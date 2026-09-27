import { deleteCategoryService } from '@/server/composition';
/** Compatibility entry for internal callers; all logic is in DeleteCategoryService. */
export function deleteCategoryAndCascade(categoryId: { toString(): string }, userId: { toString(): string }) {
  return deleteCategoryService.execute(categoryId.toString(), userId.toString());
}
