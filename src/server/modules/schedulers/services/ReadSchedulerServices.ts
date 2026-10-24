import type { SchedulerRepositoryPort } from '@/server/shared/ports/schedulers';
import type { SchedulerStatus } from '@/shared/contracts/schedulers';
import { AppError } from '@/server/shared/kernel/AppError';

export class ListSchedulersService {
  constructor(private repo: SchedulerRepositoryPort) {}
  execute(userId: string, filter: { walletId?: string; status?: SchedulerStatus } = {}) { return this.repo.list(userId, filter); }
}
export class GetSchedulerService {
  constructor(private repo: SchedulerRepositoryPort) {}
  async execute(id: string, userId: string) {
    const found = await this.repo.findOwned(id, userId);
    if (!found) throw new AppError('NOT_FOUND', 'Scheduler not found');
    return found;
  }
}
