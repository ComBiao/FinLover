import type { SchedulerRepositoryPort, SchedulerState } from '@/server/shared/ports/schedulers';
import type { TransactionContext, UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { AppError } from '@/server/shared/kernel/AppError';
import { firstDue, isFinished, todayBangkok } from '../domain/schedule';
import { cadenceOf, stateOf } from './rules';

export class SetSchedulerStatusService {
  constructor(private repo: SchedulerRepositoryPort, private uow: UnitOfWork, private now: () => Date = () => new Date()) {}
  execute(id: string, userId: string, action: 'pause' | 'resume') {
    return this.uow.run(async context => {
      const current = await this.repo.findOwned(id, userId, context);
      if (!current) throw new AppError('NOT_FOUND', 'Scheduler not found');
      const required = action === 'pause' ? 'active' : 'paused';
      if (current.status !== required) throw new AppError('CONFLICT', `Only ${required} schedulers can be ${action}d`);
      const state = stateOf(current);
      if (action === 'pause') return this.save(id, userId, { ...state, status: 'paused' }, context);
      // Resuming skips everything missed while paused: continue from the next date on or after today.
      const next = firstDue(current.nextDueDate!, todayBangkok(this.now()), cadenceOf(current));
      const finished = isFinished(current.end, current.createdCount, next);
      return this.save(id, userId, { ...state, status: finished ? 'completed' : 'active', nextDueDate: finished ? null : next }, context);
    });
  }
  private async save(id: string, userId: string, state: SchedulerState, context: TransactionContext) {
    const saved = await this.repo.replace(id, userId, state, context);
    if (!saved) throw new AppError('NOT_FOUND', 'Scheduler not found');
    return saved;
  }
}
