import type { SchedulerResponse } from '@/shared/contracts/schedulers';
import type { SchedulerRecord } from '@/server/shared/ports/schedulers';

const day = (date: Date) => date.toISOString().slice(0, 10);

export class SchedulerResponseDTO {
  /** Omits `userId`; `canManage` is true only for the Creator. */
  static from(record: SchedulerRecord, viewerId: string): SchedulerResponse {
    const { end } = record;
    return {
      id: record.id,
      walletId: record.walletId,
      categoryId: record.categoryId ?? undefined,
      categoryKey: record.categoryKey ?? undefined,
      type: record.type,
      amount: record.amount,
      title: record.title,
      note: record.note,
      startDate: day(record.startDate),
      frequency: record.frequency,
      interval: record.interval,
      end: end.type === 'count' ? { type: 'count', count: end.count! } : end.type === 'endDate' ? { type: 'endDate', endDate: day(end.endDate!) } : { type: 'never' },
      status: record.status,
      createdCount: record.createdCount,
      nextDueDate: record.nextDueDate ? day(record.nextDueDate) : null,
      canManage: record.userId === viewerId,
    };
  }
}
