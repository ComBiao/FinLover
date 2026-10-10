import "server-only";
import User from '@/server/db/models/User';
import type { UserRepositoryPort } from '@/server/shared/ports/users';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import { sessionOf } from '@/server/db/unit-of-work';

export class UserRepository implements UserRepositoryPort {
  async findByEmail(email: string) { return User.findOne({ email }); }
  async create(input: { email: string; passwordHash: string; dataPrivacyConsent: true }, context?: TransactionContext) {
    return new User(input).save({ session: sessionOf(context) });
  }
  /**
   * Permanently deletes the user and cascades to their wallets, categories, and
   * transactions. Uses the session in context when supplied; this method does
   * not start a transaction, so callers must provide one for atomic deletion.
   * Returns the deleted user document, or null when no user matches the ID.
   * ID casting, cascade, and database errors propagate to the caller.
   */
  async deleteById(userId: string, context?: TransactionContext) { return User.findOneAndDelete({ _id: userId }, { session: sessionOf(context) }); }

  /** Returns true if a user with this ID currently exists. */
  /**
   * Checks whether an account still exists, using a single indexed _id lookup.
   * Used to reject tokens that belong to deleted accounts.
   *
   * @param userId - 24-hex user ID taken from a verified token.
   */
  async existsById(userId: string): Promise<boolean> { return (await User.exists({ _id: userId })) !== null; }
}
