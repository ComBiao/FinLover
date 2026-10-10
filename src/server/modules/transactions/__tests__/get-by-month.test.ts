import { describe, expect, it, vi } from 'vitest';
import type { TransactionRepositoryPort } from '@/server/shared/ports/transactions';
import { GetTransactionsByMonthService, currentMonth, monthBoundaries } from '../services/GetTransactionsByMonthService';

function repository(): TransactionRepositoryPort {
  return {
    findByDateRange: vi.fn(async () => []),
    findOwned: vi.fn(async () => null),
    create: vi.fn(),
    update: vi.fn(async () => null),
    remove: vi.fn(async () => null),
  };
}

describe('GetTransactionsByMonthService', () => {
  it.each([
    ['2026-10', '2026-10-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z'],
    ['2024-02', '2024-02-01T00:00:00.000Z', '2024-03-01T00:00:00.000Z'],
    ['2025-02', '2025-02-01T00:00:00.000Z', '2025-03-01T00:00:00.000Z'],
    ['2026-12', '2026-12-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z'],
    ['0099-10', '0099-10-01T00:00:00.000Z', '0099-11-01T00:00:00.000Z'],
  ])('builds an inclusive start and exclusive end for %s', (month, start, end) => {
    const boundaries = monthBoundaries(month);
    expect(boundaries.start.toISOString()).toBe(start);
    expect(boundaries.end.toISOString()).toBe(end);
  });

  it('selects the current month in the configured timezone', () => {
    const instant = new Date('2026-09-30T17:30:00.000Z');
    expect(currentMonth(instant, 'Asia/Bangkok')).toBe('2026-10');
    expect(currentMonth(instant, 'UTC')).toBe('2026-09');
  });

  it('passes explicit month boundaries and the owner to the repository', async () => {
    const repo = repository();
    const service = new GetTransactionsByMonthService(repo, () => new Date('2026-01-01T00:00:00.000Z'), () => 'UTC');

    await service.execute('user-1', '2026-10');

    expect(repo.findByDateRange).toHaveBeenCalledWith(
      'user-1',
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-11-01T00:00:00.000Z'),
    );
  });

  it('defaults to the current month and year when month is omitted', async () => {
    const repo = repository();
    const service = new GetTransactionsByMonthService(repo, () => new Date('2026-09-30T17:30:00.000Z'), () => 'Asia/Bangkok');

    await service.execute('user-1');

    expect(repo.findByDateRange).toHaveBeenCalledWith(
      'user-1',
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-11-01T00:00:00.000Z'),
    );
  });
});
