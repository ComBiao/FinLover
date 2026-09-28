import type { CategoryRepositoryPort } from '@/server/shared/ports/categories';
import { validateCategoryInput } from '../middlewares/validators/input';
import { mutable } from './mutable';
export class UpdateCategoryService {
  constructor(private repo: CategoryRepositoryPort) {}
  async execute(id: string, userId: string, body: unknown) {
    await mutable(this.repo, id, userId);
    return this.repo.update(id, userId, validateCategoryInput(body, true));
  }
}
