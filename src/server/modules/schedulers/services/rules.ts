import type { SharedCategoryKey } from '@/shared/contracts';
import type { SchedulerInput } from '@/shared/contracts/schedulers';
import { MAX_END_YEARS } from '@/shared/contracts/schedulers';
import type { SchedulerCategoryAccess, SchedulerEnd, SchedulerRecord, SchedulerState } from '@/server/shared/ports/schedulers';
import type { WalletAccess } from '@/server/shared/ports/transactions';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import { AppError } from '@/server/shared/kernel/AppError';
import { resolveSharedCategoryKey } from '../../transactions/services/rules';
import { endDateFromSpan, firstDue, type Cadence } from '../domain/schedule';

/** The parsed request with calendar dates as Dates; `end` may still be a span. */
export type SchedulerCommand = Omit<SchedulerInput, 'startDate' | 'end'> & {
  startDate: Date;
  end: { type: 'never' } | { type: 'count'; count: number } | { type: 'endDate'; endDate: Date } | { type: 'span'; value: number; unit: 'weeks' | 'months' | 'years' };
};

export const cadenceOf = (s: Pick<SchedulerState, 'anchorDay' | 'frequency' | 'interval'>): Cadence =>
  ({ anchorDay: s.anchorDay, frequency: s.frequency, interval: s.interval });

const invalid = (fields: Record<string, string>) => new AppError('VALIDATION_ERROR', 'One or more fields are invalid', fields);

/** Checks the wallet and category belong to the user and returns the category id (or categoryKey for shared wallets). */
export async function resolveCategory(
  cmd: SchedulerCommand,
  userId: string,
  wallets: WalletAccess,
  categories: SchedulerCategoryAccess,
  context: TransactionContext,
  currentCategoryKey?: SharedCategoryKey | null,
): Promise<{ categoryId: string | null; categoryKey: SharedCategoryKey | null }> {
  const wallet = wallets.findById ? await wallets.findById(cmd.walletId, context) : null;
  if (wallet) {
    if (wallet.isShared) {
      if (!await wallets.exists(cmd.walletId, userId, context)) {
        throw new AppError('FORBIDDEN', 'Only wallet members can access this wallet');
      }
      // A concurrent removal of this member then conflicts and retries, instead of leaving a rule for a non-member.
      await wallets.lockMembership?.(cmd.walletId, context);
      if (cmd.categoryId) {
        throw invalid({ categoryId: 'Category is not allowed for shared wallets' });
      }
      const categoryKey = resolveSharedCategoryKey(cmd.type, cmd.categoryKey, currentCategoryKey) as SharedCategoryKey;
      return { categoryId: null, categoryKey };
    }
  }

  if (!await wallets.exists(cmd.walletId, userId, context)) throw new AppError('NOT_FOUND', 'Wallet not found');
  if (cmd.categoryKey) {
    throw invalid({ categoryKey: 'Category key is only allowed for shared wallets' });
  }
  if (cmd.categoryId) {
    if (await categories.typeOf(cmd.categoryId, userId, context) !== cmd.type) throw invalid({ categoryId: 'Referenced category does not exist or type mismatch' });
    return { categoryId: cmd.categoryId, categoryKey: null };
  }
  const fallback = await categories.fallbackId(userId, cmd.type, context);
  if (!fallback) throw invalid({ categoryId: 'Default category not found' });
  return { categoryId: fallback, categoryKey: null };
}

/** Everything a command determines; status, progress and `nextDueDate` are added by the caller. */
export function describe(cmd: SchedulerCommand, category: { categoryId: string | null; categoryKey: SharedCategoryKey | null }, today: Date) {
  const start = cmd.startDate;
  let end: SchedulerEnd;
  if (cmd.end.type === 'span') end = { type: 'endDate', endDate: endDateFromSpan(start, cmd.end.value, cmd.end.unit) };
  else if (cmd.end.type === 'endDate') end = { type: 'endDate', endDate: cmd.end.endDate };
  else if (cmd.end.type === 'count') end = { type: 'count', count: cmd.end.count };
  else end = { type: 'never' };
  const limit = new Date(start);
  limit.setUTCFullYear(limit.getUTCFullYear() + MAX_END_YEARS);
  if (end.endDate && !(end.endDate <= limit)) throw invalid({ 'end.endDate': `End date must be within ${MAX_END_YEARS} years of the start date` });
  const base: SchedulerState = {
    walletId: cmd.walletId,
    categoryId: category.categoryId,
    categoryKey: category.categoryKey,
    type: cmd.type,
    amount: cmd.amount,
    title: cmd.title,
    note: cmd.note,
    startDate: start,
    anchorDay: start.getUTCDate(),
    frequency: cmd.frequency,
    interval: cmd.interval,
    end,
    status: 'active',
    createdCount: 0,
    nextDueDate: null,
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
