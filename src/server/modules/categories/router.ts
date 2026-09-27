import type { TransactionCategoryCleanup } from '@/server/shared/ports/categories';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { CreateCategoryService } from './services/CreateCategoryService';
import { CreateCategoryController } from './controllers/CreateCategoryController';
import { UpdateCategoryService } from './services/UpdateCategoryService';
import { UpdateCategoryController } from './controllers/UpdateCategoryController';
import { DeleteCategoryService } from './services/DeleteCategoryService';
import { DeleteCategoryController } from './controllers/DeleteCategoryController';
import { CategoryRepository } from './repositories/CategoryRepository';
export function createCategoryRouter(cleanup: TransactionCategoryCleanup, uow: UnitOfWork) {
  const repo = new CategoryRepository();
  const create = new CreateCategoryController(new CreateCategoryService(repo));
  const update = new UpdateCategoryController(new UpdateCategoryService(repo));
  const remove = new DeleteCategoryController(new DeleteCategoryService(repo, cleanup, uow));
  return { create: create.handle.bind(create), update: update.handle.bind(update), remove: remove.handle.bind(remove) };
}
