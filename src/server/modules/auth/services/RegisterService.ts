import type { PasswordPort, UserRepositoryPort } from '@/server/shared/ports/users';
import type { CategoryRepositoryPort } from '@/server/shared/ports/categories';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { DEFAULT_CATEGORIES } from '../default-categories';
export class RegisterService {
  constructor(
    private users: UserRepositoryPort,
    private passwords: PasswordPort,
    private categories: CategoryRepositoryPort,
    private uow: UnitOfWork,
  ) {}
  async execute(email: string, password: string) {
    const passwordHash = await this.passwords.hash(password);
    return this.uow.run(async (context) => {
      const user = await this.users.create({ email, passwordHash, dataPrivacyConsent: true }, context);
      await this.categories.createSystemDefaults(String(user._id), DEFAULT_CATEGORIES, context);
      return user;
    });
  }
}
