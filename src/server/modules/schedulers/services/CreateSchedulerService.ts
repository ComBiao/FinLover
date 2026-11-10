import type { SchedulerCategoryAccess, SchedulerRepositoryPort, SchedulerTransactionPoster } from '@/server/shared/ports/schedulers';
import type { WalletAccess } from '@/server/shared/ports/transactions';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { AppError } from '@/server/shared/kernel/AppError';
import { MAX_SCHEDULERS_PER_USER } from '@/shared/contracts/schedulers';
import { todayBangkok } from '../domain/schedule';
import { postOccurrence } from './posting';
import { describe, resolveCategory, type SchedulerCommand } from './rules';

export class CreateSchedulerService {
  constructor(
    private repo: SchedulerRepositoryPort, private wallets: WalletAccess, private categories: SchedulerCategoryAccess,
    private poster: SchedulerTransactionPoster, private uow: UnitOfWork, private now: () => Date = () => new Date(),
  ) {}
  execute(userId: string, cmd: SchedulerCommand) {
    return this.uow.run(async context => {
      const today = todayBangkok(this.now());
      const category = await resolveCategory(cmd, userId, this.wallets, this.categories, context);
      // shortcut: count-then-insert can overshoot the cap under concurrent requests; add a per-user lock if it matters.
      if (await this.repo.countByUser(userId, context) >= MAX_SCHEDULERS_PER_USER) throw new AppError('CONFLICT', `You can have at most ${MAX_SCHEDULERS_PER_USER} active or paused schedulers`);
      const { base, first } = describe(cmd, category, today);
      if (base.end.endDate && first > base.end.endDate) throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { 'end.endDate': 'No occurrence falls on or before the end date' });
      const created = await this.repo.create(userId, { ...base, status: 'active', createdCount: 0, nextDueDate: first }, context);
      // A start date of today posts straight away, through the same path as the daily job.
      return first.getTime() === today.getTime() ? (await postOccurrence(this.repo, this.poster, created, context)) ?? created : created;
    });
  }
}
