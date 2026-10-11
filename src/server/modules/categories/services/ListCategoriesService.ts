import { AppError } from '@/server/shared/kernel/AppError';
import type { CategoryRepositoryPort } from '@/server/shared/ports/categories';
import { categoryListQuery } from '@/shared/contracts';
import { validationFields } from '@/shared/contracts/validation';
export class ListCategoriesService {
  constructor(private repo: CategoryRepositoryPort) {}
  async execute(userId: string, query: unknown) {
    const result = categoryListQuery.safeParse(query);
    if (!result.success) throw new AppError('VALIDATION_ERROR', 'Validation failed', validationFields(result.error));
    return this.repo.list(userId, result.data.type);
  }
}
