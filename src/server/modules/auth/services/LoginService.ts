import type { PasswordPort, UserRepositoryPort } from '@/server/shared/ports/users';
const DUMMY_HASH = '$2b$10$ZCo1PYlT87WpnNfBTjsIeuYugew6RVOdi88yCj/vNVWFKZbAkyrlS';
export class LoginService {
  constructor(private users: UserRepositoryPort, private passwords: PasswordPort) {}
  async execute(email: string, password: string) {
    const user = await this.users.findByEmail(email.toLowerCase().trim());
    const matches = await this.passwords.compare(password, user?.passwordHash ?? DUMMY_HASH);
    return user && matches ? user : null;
  }
}
