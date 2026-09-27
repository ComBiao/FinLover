import type { CategoryRepositoryPort, TransactionCategoryCleanup } from '@/server/shared/ports/categories';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { AppError } from '@/server/shared/kernel/AppError';
import { mutable } from './mutable';
export class DeleteCategoryService {
  constructor(private repo: CategoryRepositoryPort, private cleanup: TransactionCategoryCleanup, private uow: UnitOfWork) {}
  execute(id: string, userId: string) {
    return this.uow.run(async context => {
      await mutable(this.repo, id, userId, context);
      const result = await this.repo.delete(id, userId, context);
      if (!result) throw new AppError('NOT_FOUND', 'Category not found');
      await this.cleanup.clearCategory(id, userId, context);
      return result;
    });
  }
}
