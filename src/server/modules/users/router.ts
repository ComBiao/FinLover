import type { UserRepositoryPort } from '@/server/shared/ports/users';
import { LookupUserService } from './services/LookupUserService';
import { LookupUserController } from './controllers/LookupUserController';

export function createUserRouter(users: UserRepositoryPort) {
  const lookupService = new LookupUserService(users);
  const lookupController = new LookupUserController(lookupService);
  return {
    lookup: lookupController.handle.bind(lookupController),
  };
}
