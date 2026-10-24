import type { SchedulerRepositoryPort } from '@/server/shared/ports/schedulers';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { AppError } from '@/server/shared/kernel/AppError';

/** Hard delete; Transactions it already created stay in the ledger. */
export class DeleteSchedulerService {
  constructor(private repo: SchedulerRepositoryPort, private uow: UnitOfWork) {}
  execute(id: string, userId: string) {
    return this.uow.run(async context => {
      if (!await this.repo.remove(id, userId, context)) throw new AppError('NOT_FOUND', 'Scheduler not found');
    });
  }
}
