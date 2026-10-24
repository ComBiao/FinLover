import type { SchedulerFrequency, SchedulerStatus } from '@/shared/contracts/schedulers';
import type { CategoryAccess, TransactionInput } from './transactions';
import type { TransactionContext } from './unit-of-work';

export interface SchedulerEnd { type: 'never' | 'count' | 'endDate'; count?: number; endDate?: Date }
export interface SchedulerState {
  walletId: string;
  categoryId: string;
  type: 'income' | 'expense';
  amount: number;
  title: string;
  note?: string;
  startDate: Date;
  anchorDay: number;
  frequency: SchedulerFrequency;
  interval: number;
  end: SchedulerEnd;
  status: SchedulerStatus;
  createdCount: number;
  nextDueDate: Date | null;
}
export interface SchedulerRecord extends SchedulerState { id: string; userId: string }
export type SchedulerProgress = Pick<SchedulerState, 'createdCount' | 'nextDueDate' | 'status'>;

export interface SchedulerRepositoryPort {
  list(userId: string, filter?: { walletId?: string; status?: SchedulerStatus }): Promise<SchedulerRecord[]>;
  findOwned(id: string, userId: string, context?: TransactionContext): Promise<SchedulerRecord | null>;
  countByUser(userId: string, context: TransactionContext): Promise<number>;
  /** Active Schedulers due on or before `today`, oldest first. */
  findDue(today: Date, limit: number): Promise<SchedulerRecord[]>;
  create(userId: string, state: SchedulerState, context: TransactionContext): Promise<SchedulerRecord>;
  replace(id: string, userId: string, state: SchedulerState, context: TransactionContext): Promise<SchedulerRecord | null>;
  remove(id: string, userId: string, context: TransactionContext): Promise<SchedulerRecord | null>;
  /** Moves Schedulers off a category that is being deleted; `fallbackFor` returns the "Others" id for the Scheduler type. */
  reassignCategory(categoryId: string, userId: string, fallbackFor: (type: 'income' | 'expense') => Promise<string | null>, context: TransactionContext): Promise<void>;
  /** System stop when `userId` loses write access to `walletId`: permanent, unlike pause. */
  cancelByCreatorAndWallet(userId: string, walletId: string, context: TransactionContext): Promise<void>;
  /** Compare-and-set on an active Scheduler's `nextDueDate`; false means another run got there first. */
  advance(id: string, expectedNextDue: Date, progress: SchedulerProgress, context: TransactionContext): Promise<boolean>;
}

export interface SchedulerCategoryAccess extends CategoryAccess {
  /** The user's system "Others" category for this type. */
  fallbackId(userId: string, type: 'income' | 'expense', context: TransactionContext): Promise<string | null>;
}
/** Posts one Transaction inside the caller's UnitOfWork, so the Scheduler advance and the ledger write commit together. */
export interface SchedulerTransactionPoster { post(userId: string, input: TransactionInput, context: TransactionContext): Promise<unknown> }
