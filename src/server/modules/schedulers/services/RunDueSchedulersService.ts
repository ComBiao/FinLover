import type { SchedulerRecord, SchedulerRepositoryPort, SchedulerTransactionPoster } from '@/server/shared/ports/schedulers';
import type { WalletAccess } from '@/server/shared/ports/transactions';
import type { TransactionContext, UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { todayBangkok } from '../domain/schedule';
import { postOccurrence } from './posting';

export const MAX_CATCH_UP = 366;
const BATCH = 500;

/** The daily job: posts every due occurrence, catching up missed days with their original dates. */
export class RunDueSchedulersService {
  constructor(
    private repo: SchedulerRepositoryPort, private wallets: WalletAccess, private poster: SchedulerTransactionPoster,
    private uow: UnitOfWork, private now: () => Date = () => new Date(),
  ) {}
  async execute() {
    const today = todayBangkok(this.now());
    const summary = { schedulers: 0, posted: 0, cancelled: 0, failed: 0 };
    for (const scheduler of await this.repo.findDue(today, BATCH)) {
      summary.schedulers++;
      let current: SchedulerRecord | null = scheduler;
      try {
        // One UnitOfWork per occurrence, so a failure keeps everything posted before it.
        for (let i = 0; i < MAX_CATCH_UP && current?.status === 'active' && current.nextDueDate! <= today; i++) {
          const step: SchedulerRecord = current;
          current = await this.uow.run(context => this.step(step, context));
          if (current?.status === 'cancelled') summary.cancelled++;
          else if (current) summary.posted++;
        }
      } catch {
        summary.failed++;
        console.error('scheduler run failed', { schedulerId: scheduler.id }); // id only: never log financial payloads
      }
    }
    return summary;
  }
  private async step(s: SchedulerRecord, context: TransactionContext) {
    // The Creator may have lost access to the wallet; such a Scheduler stops for good.
    if (!await this.wallets.exists(s.walletId, s.userId, context)) {
      const progress = { createdCount: s.createdCount, nextDueDate: null, status: 'cancelled' as const };
      return await this.repo.advance(s.id, s.nextDueDate!, progress, context) ? { ...s, ...progress } : null;
    }
    return postOccurrence(this.repo, this.poster, s, context);
  }
}
