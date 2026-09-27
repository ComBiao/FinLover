import "server-only";
import User from '@/server/db/models/User';
import type { UserRepositoryPort } from '@/server/shared/ports/users';
export class UserRepository implements UserRepositoryPort {
  async findByEmail(email: string) { return User.findOne({ email }); }
  async create(input: { email: string; passwordHash: string; dataPrivacyConsent: true }) { return User.create(input); }
}
