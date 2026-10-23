import { z } from 'zod';
import { objectId, transactionAttribution } from './api';

export const SCHEDULER_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const;
export const SCHEDULER_STATUSES = ['active', 'paused', 'completed', 'cancelled'] as const;
export const MAX_SCHEDULERS_PER_USER = 50;
export const MAX_COUNT_END = 1000;
export const MAX_END_YEARS = 50;
/** Largest `interval` per frequency: 365 days, 52 weeks, 60 months, 5 years. */
export const MAX_INTERVAL = { daily: 365, weekly: 52, monthly: 60, yearly: 5 } as const;

export const schedulerFrequency = z.enum(SCHEDULER_FREQUENCIES);
export const schedulerStatus = z.enum(SCHEDULER_STATUSES);
export type SchedulerFrequency = z.infer<typeof schedulerFrequency>;
export type SchedulerStatus = z.infer<typeof schedulerStatus>;

/** Requests may also give a span ("5 months"); the server turns it into `endDate`. */
export const schedulerEndInput = z.discriminatedUnion('type', [
  z.object({ type: z.literal('never') }),
  z.object({ type: z.literal('count'), count: z.number().int().min(1).max(MAX_COUNT_END) }),
  z.object({ type: z.literal('endDate'), endDate: z.iso.date() }),
  z.object({ type: z.literal('span'), value: z.number().int().min(1), unit: z.enum(['weeks', 'months', 'years']) }),
]);
export const schedulerEndResponse = z.discriminatedUnion('type', [
  z.object({ type: z.literal('never') }),
  z.object({ type: z.literal('count'), count: z.number().int() }),
  z.object({ type: z.literal('endDate'), endDate: z.iso.date() }),
]);

export const schedulerInput = z.object({
  walletId: objectId,
  categoryId: objectId.optional(),
  type: z.enum(['income', 'expense']),
  amount: z.number().min(0.01),
  title: z.string().trim().min(1).max(100),
  note: z.string().max(255).optional(),
  startDate: z.iso.date(),
  frequency: schedulerFrequency,
  interval: z.number().int().min(1),
  end: schedulerEndInput,
}).superRefine((value, ctx) => {
  if (value.interval > MAX_INTERVAL[value.frequency]) {
    ctx.addIssue({ code: 'custom', path: ['interval'], message: `interval must be at most ${MAX_INTERVAL[value.frequency]} for ${value.frequency}` });
  }
  if (value.end.type === 'endDate' && value.end.endDate < value.startDate) {
    ctx.addIssue({ code: 'custom', path: ['end', 'endDate'], message: 'End date must not be before start date' });
  }
});
// PUT replaces every editable field; `status` has its own endpoint.
export const schedulerUpdate = schedulerInput;
export const schedulerStatusInput = z.object({ action: z.enum(['pause', 'resume']) });
export const schedulerListQuery = z.object({ walletId: objectId.optional(), status: schedulerStatus.optional() });

export const schedulerResponse = z.object({
  id: objectId,
  walletId: objectId,
  categoryId: objectId,
  type: z.enum(['income', 'expense']),
  amount: z.number(),
  title: z.string(),
  note: z.string().optional(),
  startDate: z.iso.date(),
  frequency: schedulerFrequency,
  interval: z.number().int(),
  end: schedulerEndResponse,
  status: schedulerStatus,
  createdCount: z.number().int(),
  /** Null once the Scheduler is completed or cancelled. */
  nextDueDate: z.iso.date().nullable(),
  /** True only for the Creator; other wallet members get a read-only view. */
  canManage: z.boolean(),
  createdBy: transactionAttribution.optional(),
});
export type SchedulerInput = z.infer<typeof schedulerInput>;
export type SchedulerResponse = z.infer<typeof schedulerResponse>;
