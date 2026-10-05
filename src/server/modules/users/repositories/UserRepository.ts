import "server-only";
import User from '@/server/db/models/User';
import type { UserRepositoryPort } from '@/server/shared/ports/users';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import { sessionOf } from '@/server/db/unit-of-work';

export class UserRepository implements UserRepositoryPort {
  async findByEmail(email: string) { return User.findOne({ email }); }
  async create(input: { email: string; passwordHash: string; dataPrivacyConsent: true }) { return User.create(input); }
  async deleteById(userId: string, context?: TransactionContext) { return User.findOneAndDelete({ _id: userId }, { session: sessionOf(context) }); }
}