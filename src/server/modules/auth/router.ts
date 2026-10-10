import type { UserRepositoryPort, PasswordPort } from '@/server/shared/ports/users';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import type { CategoryRepositoryPort } from '@/server/shared/ports/categories';
import { LoginService } from './services/LoginService';
import { RegisterService } from './services/RegisterService';
import { DeleteAccountService } from './services/DeleteAccountService';
import { GetCurrentUserService } from './services/GetCurrentUserService';
import { GetCurrentUserController } from './controllers/GetCurrentUserController';
import { LoginController } from './controllers/LoginController';
import { RegisterController } from './controllers/RegisterController';
import { LogoutController } from './controllers/LogoutController';
import { DeleteAccountController } from './controllers/DeleteAccountController';
/**
 * Returns bound login, registration, logout, and account-deletion handlers.
 * The unit of work applies to account deletion. Callers must apply authentication
 * and Origin policies before exposing these handlers as routes.
 */
export function createAuthRouter(users: UserRepositoryPort, passwords: PasswordPort, categories: CategoryRepositoryPort, uow: UnitOfWork) {
  const login = new LoginController(new LoginService(users, passwords));
  const register = new RegisterController(new RegisterService(users, passwords, categories, uow));
  const logout = new LogoutController();
  const me = new GetCurrentUserController(new GetCurrentUserService(users));
  const deleteAccount = new DeleteAccountController(new DeleteAccountService(users, uow));
  return {
    login: login.handle.bind(login),
    register: register.handle.bind(register),
    logout: logout.handle.bind(logout),
    me: me.handle.bind(me),
    deleteAccount: deleteAccount.handle.bind(deleteAccount),
  };
}
