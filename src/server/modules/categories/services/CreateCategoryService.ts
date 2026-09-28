import type { CategoryRepositoryPort } from '@/server/shared/ports/categories';
import { validateCategoryInput } from '../middlewares/validators/input';
export class CreateCategoryService {
  constructor(private repo: CategoryRepositoryPort) {}
  async execute(userId: string, body: unknown) {
    return this.repo.create(userId, validateCategoryInput(body, false));
  }
}
