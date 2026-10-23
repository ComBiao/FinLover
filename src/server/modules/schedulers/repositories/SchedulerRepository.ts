import "server-only";
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import { sessionOf } from '@/server/db/unit-of-work';
import Scheduler, { type IScheduler } from '@/server/db/models/Scheduler';
import { authorizeTransactionWrite } from '@/server/db/transaction-write-guard';
import type { SchedulerStatus } from '@/shared/contracts/schedulers';
import type { SchedulerProgress, SchedulerRecord, SchedulerRepositoryPort, SchedulerState } from '@/server/shared/ports/schedulers';

function record(doc: IScheduler): SchedulerRecord {
  return {
    id: String(doc._id), userId: String(doc.userId), walletId: String(doc.walletId), categoryId: String(doc.categoryId),
    type: doc.type, amount: Number(doc.amount), title: doc.title, note: doc.note,
    startDate: doc.startDate, anchorDay: doc.anchorDay, frequency: doc.frequency, interval: doc.interval,
    end: { type: doc.endType, count: doc.endCount, endDate: doc.endDate },
    status: doc.status, createdCount: doc.createdCount, nextDueDate: doc.nextDueDate ?? null,
  };
}
// Flat storage of the end condition; unused parts are cleared so a changed end never keeps stale values.
function fields({ end, note, ...state }: SchedulerState) {
  return { ...state, notes: note, endType: end.type, endCount: end.count, endDate: end.endDate };
}

export class SchedulerRepository implements SchedulerRepositoryPort {
  async list(userId: string, filter: { walletId?: string; status?: SchedulerStatus } = {}) {
    const docs = await Scheduler.find({ userId, ...filter }).sort({ nextDueDate: 1, _id: 1 });
    // Mongo sorts nulls first; completed/cancelled go last so upcoming runs lead.
    return docs.map(record).sort((a, b) => Number(a.nextDueDate === null) - Number(b.nextDueDate === null));
  }
  async findOwned(id: string, userId: string, context?: TransactionContext) {
    const doc = await Scheduler.findOne({ _id: id, userId }).session(sessionOf(context) ?? null);
    return doc ? record(doc) : null;
  }
  countByUser(userId: string, context: TransactionContext) {
    return Scheduler.countDocuments({ userId, status: { $in: ['active', 'paused'] } }).session(sessionOf(context)!);
  }
  async findDue(today: Date, limit: number) {
    const docs = await Scheduler.find({ status: 'active', nextDueDate: { $lte: today } }).sort({ nextDueDate: 1, _id: 1 }).limit(limit);
    return docs.map(record);
  }
  async create(userId: string, state: SchedulerState, context: TransactionContext) {
    const doc = authorizeTransactionWrite(new Scheduler({ ...fields(state), userId }), context);
    return record(await doc.save({ session: sessionOf(context) }));
  }
  async replace(id: string, userId: string, state: SchedulerState, context: TransactionContext) {
    const doc = await Scheduler.findOne({ _id: id, userId }).session(sessionOf(context)!);
    if (!doc) return null;
    doc.set(fields(state));
    authorizeTransactionWrite(doc, context);
    return record(await doc.save({ session: sessionOf(context) }));
  }
  async remove(id: string, userId: string, context: TransactionContext) {
    const doc = await authorizeTransactionWrite(Scheduler.findOneAndDelete({ _id: id, userId }, { session: sessionOf(context) }), context);
    return doc ? record(doc) : null;
  }
  async reassignCategory(categoryId: string, userId: string, fallbackFor: (type: 'income' | 'expense') => Promise<string | null>, context: TransactionContext) {
    for (const type of ['income', 'expense'] as const) {
      const filter = { categoryId, userId, type };
      if (!await Scheduler.exists(filter).session(sessionOf(context)!)) continue;
      const fallback = await fallbackFor(type);
      if (!fallback) throw new Error('Default category missing for scheduler reassignment');
      await authorizeTransactionWrite(Scheduler.updateMany(filter, { $set: { categoryId: fallback } }, { session: sessionOf(context) }), context);
    }
  }
  async cancelByCreatorAndWallet(userId: string, walletId: string, context: TransactionContext) {
    await authorizeTransactionWrite(
      Scheduler.updateMany({ userId, walletId, status: { $in: ['active', 'paused'] } }, { $set: { status: 'cancelled', nextDueDate: null } }, { session: sessionOf(context) }),
      context,
    );
  }
  async advance(id: string, expectedNextDue: Date, progress: SchedulerProgress, context: TransactionContext) {
    const result = await authorizeTransactionWrite(
      Scheduler.updateOne({ _id: id, status: 'active', nextDueDate: expectedNextDue }, { $set: progress }, { session: sessionOf(context) }),
      context,
    );
    return result.matchedCount === 1;
  }
}
