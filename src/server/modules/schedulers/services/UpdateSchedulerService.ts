import type { SchedulerCategoryAccess, SchedulerRepositoryPort } from '@/server/shared/ports/schedulers';
import type { WalletAccess } from '@/server/shared/ports/transactions';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { AppError } from '@/server/shared/kernel/AppError';
import { isFinished, todayBangkok } from '../domain/schedule';
import { assertOpen, describe, resolveCategory, type SchedulerCommand } from './rules';

/** Forward-only: past Transactions stay as they are, and a changed cadence restarts from today. */
export class UpdateSchedulerService {
  constructor(private repo: SchedulerRepositoryPort, private wallets: WalletAccess, private categories: SchedulerCategoryAccess, private uow: UnitOfWork, private now: () => Date = () => new Date()) {}
  execute(id: string, userId: string, cmd: SchedulerCommand) {
    return this.uow.run(async context => {
      const current = await this.repo.findOwned(id, userId, context);
      if (!current) throw new AppError('NOT_FOUND', 'Scheduler not found');
      assertOpen(current);
      const categoryId = await resolveCategory(cmd, userId, this.wallets, this.categories, context);
      const { base, first } = describe(cmd, categoryId, todayBangkok(this.now()));
      const sameCadence = base.startDate.getTime() === current.startDate.getTime() && base.frequency === current.frequency && base.interval === current.interval;
      const nextDueDate = sameCadence ? current.nextDueDate! : first;
      // An edited end may already be met: finish rather than leave a Scheduler that would never run.
      const finished = isFinished(base.end, current.createdCount, nextDueDate);
      const updated = await this.repo.replace(id, userId, {
        ...base, createdCount: current.createdCount,
        status: finished ? 'completed' : current.status, nextDueDate: finished ? null : nextDueDate,
      }, context);
      if (!updated) throw new AppError('NOT_FOUND', 'Scheduler not found');
      return updated;
    });
  }
}
