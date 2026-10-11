import type { UserRepositoryPort } from '@/server/shared/ports/users';
import { AppError } from '@/server/shared/kernel/AppError';
export class GetCurrentUserService {
  constructor(private users: UserRepositoryPort) {}
  async execute(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new AppError('NOT_FOUND', 'User not found');
    return user;
  }
}
