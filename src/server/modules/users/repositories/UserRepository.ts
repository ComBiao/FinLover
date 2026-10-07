import "server-only";
import User from '@/server/db/models/User';
import type { UserRepositoryPort } from '@/server/shared/ports/users';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import { sessionOf } from '@/server/db/unit-of-work';

export class UserRepository implements UserRepositoryPort {
  async findByEmail(email: string) { return User.findOne({ email }); }
  async create(input: { email: string; passwordHash: string; dataPrivacyConsent: true }) { return User.create(input); }
  /**
   * Permanently deletes the user and cascades to their wallets, categories, and
   * transactions. Uses the session in context when supplied; this method does
   * not start a transaction, so callers must provide one for atomic deletion.
   * Returns the deleted user document, or null when no user matches the ID.
   * ID casting, cascade, and database errors propagate to the caller.
   */
  async deleteById(userId: string, context?: TransactionContext) { return User.findOneAndDelete({ _id: userId }, { session: sessionOf(context) }); }
}