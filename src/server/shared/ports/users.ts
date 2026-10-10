import type { TransactionContext } from './unit-of-work';

export interface UserRecord {
  _id: { toString(): string }; email: string; passwordHash: string;
  dataPrivacyConsent: boolean; createdAt: Date;
}
export interface UserRepositoryPort {
  findByEmail(email: string): Promise<UserRecord | null>;
  create(input: { email: string; passwordHash: string; dataPrivacyConsent: true }): Promise<UserRecord>;
  /**
   * Permanently deletes the user by ID using the optional transaction context.
   * Resolves to the deleted record or null if absent; deletion errors propagate.
   */
  deleteById(userId: string, context?: TransactionContext): Promise<{ _id: unknown } | null>;
  existsById(userId: string): Promise<boolean>;
}
export interface PasswordPort { hash(value: string): Promise<string>; compare(value: string, hash: string): Promise<boolean> }
