import type { UserRepositoryPort } from '@/server/shared/ports/users';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { AppError } from '@/server/shared/kernel/AppError';

/**
 * Hard-deletes a user. The actual wallet/category/transaction cascade lives
 * entirely in the User model's pre('findOneAndDelete') hook -- this service
 * doesn't duplicate that logic, it just has to run the delete inside a
 * UnitOfWork so the hook's internal deleteMany() calls (which read the
 * session off this.getOptions().session) are part of the same atomic
 * transaction, rather than four separate, non-atomic writes.
 */
export class DeleteAccountService {
  constructor(private users: UserRepositoryPort, private uow: UnitOfWork) {}

  /**
   * Permanently deletes the user by ID within the supplied unit of work and returns
   * the deleted record. The repository handles deletion of related account data.
   * Rejects with AppError(NOT_FOUND) when the user does not exist; repository and
   * unit-of-work errors propagate to the caller.
   */
  execute(userId: string) {
    return this.uow.run(async (context) => {
      const deletedUser = await this.users.deleteById(userId, context);
      if (!deletedUser) {
        // A verified session pointing at an account that's already gone --
        // a stale or replayed token, not a server error.
        throw new AppError('NOT_FOUND', 'Account not found');
      }
      return deletedUser;
    });
  }
}