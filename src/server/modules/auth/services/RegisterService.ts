import type { PasswordPort, UserRepositoryPort } from '@/server/shared/ports/users';
export class RegisterService {
  constructor(private users: UserRepositoryPort, private passwords: PasswordPort) {}
  async execute(email: string, password: string) {
    return this.users.create({ email, passwordHash: await this.passwords.hash(password), dataPrivacyConsent: true });
  }
}
