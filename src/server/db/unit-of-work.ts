import mongoose, { type ClientSession } from 'mongoose';
import type { TransactionContext, UnitOfWork } from '@/server/shared/ports/unit-of-work';
export function sessionOf(context?: TransactionContext) { return context?.session as ClientSession | undefined; }
export class MongoUnitOfWork implements UnitOfWork {
  async run<T>(work: (context: TransactionContext) => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
    try { return await session.withTransaction(() => work({ session })); }
    finally { await session.endSession(); }
  }
}
