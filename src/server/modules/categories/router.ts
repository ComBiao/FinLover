import { CreateCategoryService } from './services/CreateCategoryService';
import { CreateCategoryController } from './controllers/CreateCategoryController';
import { UpdateCategoryService } from './services/UpdateCategoryService';
import { UpdateCategoryController } from './controllers/UpdateCategoryController';
import type { DeleteCategoryService } from './services/DeleteCategoryService';
import { DeleteCategoryController } from './controllers/DeleteCategoryController';
import { CategoryRepository } from './repositories/CategoryRepository';
export function createCategoryRouter(deleteCategoryService: DeleteCategoryService) {
  const repo = new CategoryRepository();
  const create = new CreateCategoryController(new CreateCategoryService(repo));
  const update = new UpdateCategoryController(new UpdateCategoryService(repo));
  const remove = new DeleteCategoryController(deleteCategoryService);
  return { create: create.handle.bind(create), update: update.handle.bind(update), remove: remove.handle.bind(remove) };
}
