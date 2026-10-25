import type { UserRepositoryPort } from '@/server/shared/ports/users';
import { AppError } from '@/server/shared/kernel/AppError';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class LookupUserService {
  constructor(private users: UserRepositoryPort) {}

  async execute(email: string | null | undefined, callerUserId?: string) {
    const normalized = email?.trim().toLowerCase();
    if (!normalized || !EMAIL_REGEX.test(normalized)) {
      throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { email: 'Enter a valid email address' });
    }
    const target = await this.users.findByEmail(normalized);
    if (!target) {
      throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { email: 'User not found' });
    }
    if (String(target._id) === callerUserId) {
      throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { email: 'Cannot invite yourself' });
    }
    return {
      id: String(target._id),
      email: target.email,
      name: target.name?.trim() || 'Unnamed user',
    };
  }
}
