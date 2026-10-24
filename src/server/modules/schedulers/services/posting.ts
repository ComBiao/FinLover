import type { SchedulerRecord, SchedulerRepositoryPort, SchedulerTransactionPoster } from '@/server/shared/ports/schedulers';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import { isFinished, nextAfter } from '../domain/schedule';
import { cadenceOf } from './rules';

/**
 * Posts the Scheduler's due occurrence and advances it, inside the caller's UnitOfWork.
 * Returns null when another run already advanced it (nothing is posted then).
 */
export async function postOccurrence(repo: SchedulerRepositoryPort, poster: SchedulerTransactionPoster, s: SchedulerRecord, context: TransactionContext) {
  const due = s.nextDueDate!;
  const createdCount = s.createdCount + 1;
  const next = nextAfter(due, cadenceOf(s));
  const finished = isFinished(s.end, createdCount, next);
  const progress = { createdCount, nextDueDate: finished ? null : next, status: finished ? 'completed' as const : 'active' as const };
  if (!await repo.advance(s.id, due, progress, context)) return null;
  await poster.post(s.userId, { walletId: s.walletId, categoryId: s.categoryId, type: s.type, amount: s.amount, date: due, title: s.title, note: s.note }, context);
  return { ...s, ...progress };
}
