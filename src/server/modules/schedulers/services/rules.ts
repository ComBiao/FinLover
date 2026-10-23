import type { SchedulerInput } from '@/shared/contracts/schedulers';
import { MAX_END_YEARS } from '@/shared/contracts/schedulers';
import type { SchedulerCategoryAccess, SchedulerEnd, SchedulerRecord, SchedulerState } from '@/server/shared/ports/schedulers';
import type { WalletAccess } from '@/server/shared/ports/transactions';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import { AppError } from '@/server/shared/kernel/AppError';
import { endDateFromSpan, firstDue, type Cadence } from '../domain/schedule';

/** The parsed request with calendar dates as Dates; `end` may still be a span. */
export type SchedulerCommand = Omit<SchedulerInput, 'startDate' | 'end'> & {
  startDate: Date;
  end: { type: 'never' } | { type: 'count'; count: number } | { type: 'endDate'; endDate: Date } | { type: 'span'; value: number; unit: 'weeks' | 'months' | 'years' };
};

export const cadenceOf = (s: Pick<SchedulerState, 'anchorDay' | 'frequency' | 'interval'>): Cadence =>
  ({ anchorDay: s.anchorDay, frequency: s.frequency, interval: s.interval });

const invalid = (fields: Record<string, string>) => new AppError('VALIDATION_ERROR', 'One or more fields are invalid', fields);

/** Checks the wallet and category belong to the user and returns the category id (the type's "Others" when none is given). */
export async function resolveCategory(cmd: SchedulerCommand, userId: string, wallets: WalletAccess, categories: SchedulerCategoryAccess, context: TransactionContext) {
  if (!await wallets.exists(cmd.walletId, userId, context)) throw new AppError('NOT_FOUND', 'Wallet not found');
  if (cmd.categoryId) {
    if (await categories.typeOf(cmd.categoryId, userId, context) !== cmd.type) throw invalid({ categoryId: 'Referenced category does not exist or type mismatch' });
    return cmd.categoryId;
  }
  const fallback = await categories.fallbackId(userId, cmd.type, context);
  if (!fallback) throw invalid({ categoryId: 'Default category not found' });
  return fallback;
}

/** Everything a command determines; status, progress and `nextDueDate` are added by the caller. */
export function describe(cmd: SchedulerCommand, categoryId: string, today: Date) {
  const start = cmd.startDate;
  let end: SchedulerEnd;
  if (cmd.end.type === 'span') end = { type: 'endDate', endDate: endDateFromSpan(start, cmd.end.value, cmd.end.unit) };
  else if (cmd.end.type === 'endDate') end = { type: 'endDate', endDate: cmd.end.endDate };
  else if (cmd.end.type === 'count') end = { type: 'count', count: cmd.end.count };
  else end = { type: 'never' };
  const limit = new Date(start);
  limit.setUTCFullYear(limit.getUTCFullYear() + MAX_END_YEARS);
  if (end.endDate && !(end.endDate <= limit)) throw invalid({ 'end.endDate': `End date must be within ${MAX_END_YEARS} years of the start date` });
  const base = {
    walletId: cmd.walletId, categoryId, type: cmd.type, amount: cmd.amount, title: cmd.title, note: cmd.note,
    startDate: start, anchorDay: start.getUTCDate(), frequency: cmd.frequency, interval: cmd.interval, end,
  };
  return { base, first: firstDue(start, today, cadenceOf(base)) };
}

export function stateOf(record: SchedulerRecord): SchedulerState {
  const state: Partial<SchedulerRecord> = { ...record };
  delete state.id;
  delete state.userId;
  return state as SchedulerState;
}

export const assertOpen = (s: SchedulerRecord) => {
  if (s.status !== 'active' && s.status !== 'paused') throw new AppError('CONFLICT', `A ${s.status} scheduler cannot be changed`);
};
