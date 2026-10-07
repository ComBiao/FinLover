import type { UserRepositoryPort, PasswordPort } from '@/server/shared/ports/users';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { LoginService } from './services/LoginService';
import { RegisterService } from './services/RegisterService';
import { DeleteAccountService } from './services/DeleteAccountService';
import { LoginController } from './controllers/LoginController';
import { RegisterController } from './controllers/RegisterController';
import { LogoutController } from './controllers/LogoutController';
import { DeleteAccountController } from './controllers/DeleteAccountController';
/**
 * Returns bound login, registration, logout, and account-deletion handlers.
 * The unit of work applies to account deletion. Callers must apply authentication
 * and Origin policies before exposing these handlers as routes.
 */
export function createAuthRouter(users: UserRepositoryPort, passwords: PasswordPort, uow: UnitOfWork) {
  const login = new LoginController(new LoginService(users, passwords));
  const register = new RegisterController(new RegisterService(users, passwords));
  const logout = new LogoutController();
  const deleteAccount = new DeleteAccountController(new DeleteAccountService(users, uow));
  return {
    login: login.handle.bind(login),
    register: register.handle.bind(register),
    logout: logout.handle.bind(logout),
    deleteAccount: deleteAccount.handle.bind(deleteAccount),
  };
}