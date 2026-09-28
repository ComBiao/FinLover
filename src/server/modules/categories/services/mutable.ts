import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import type { CategoryRepositoryPort } from '@/server/shared/ports/categories';
import { AppError } from '@/server/shared/kernel/AppError';
export async function mutable(repo: CategoryRepositoryPort, id: string, userId: string, context?: TransactionContext) {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw new AppError('VALIDATION_ERROR', 'Invalid category ID', {});
  const category = await repo.findOwned(id, userId, context);
  if (!category) throw new AppError('NOT_FOUND', 'Category not found');
  if (category.isSystem) throw new AppError('FORBIDDEN', 'System categories cannot be modified or deleted');
  return category;
}
