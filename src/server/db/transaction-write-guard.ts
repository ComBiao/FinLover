import type { ClientSession } from 'mongoose';
import { sessionOf } from './unit-of-work';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';

const authorized = new WeakMap<object, ClientSession>();
/** Repository-only capability for one model operation in an active UnitOfWork. */
export function authorizeTransactionWrite<T extends object>(operation: T, context: TransactionContext): T {
  const session = sessionOf(context);
  if (!session?.inTransaction()) throw new Error('Transaction writes require an active UnitOfWork');
  authorized.set(operation, session);
  return operation;
}
export function assertTransactionWrite(operation: object, session?: ClientSession | null) {
  const expected = authorized.get(operation);
  authorized.delete(operation);
  if (!expected || expected !== session || !expected.inTransaction()) {
    throw new Error('Transaction writes must use TransactionRepository inside a UnitOfWork');
  }
}
