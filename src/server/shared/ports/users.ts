export interface UserRecord {
  _id: { toString(): string }; email: string; passwordHash: string;
  dataPrivacyConsent: boolean; createdAt: Date;
}
export interface UserRepositoryPort {
  findByEmail(email: string): Promise<UserRecord | null>;
  create(input: { email: string; passwordHash: string; dataPrivacyConsent: true }): Promise<UserRecord>;
}
export interface PasswordPort { hash(value: string): Promise<string>; compare(value: string, hash: string): Promise<boolean> }
