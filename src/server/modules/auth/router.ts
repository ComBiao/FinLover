import type { UserRepositoryPort, PasswordPort } from '@/server/shared/ports/users';
import { LoginService } from './services/LoginService';
import { RegisterService } from './services/RegisterService';
import { LoginController } from './controllers/LoginController';
import { RegisterController } from './controllers/RegisterController';
import { LogoutController } from './controllers/LogoutController';
export function createAuthRouter(users: UserRepositoryPort, passwords: PasswordPort) {
  const login = new LoginController(new LoginService(users, passwords));
  const register = new RegisterController(new RegisterService(users, passwords));
  const logout = new LogoutController();
  return { login: login.handle.bind(login), register: register.handle.bind(register), logout: logout.handle.bind(logout) };
}
