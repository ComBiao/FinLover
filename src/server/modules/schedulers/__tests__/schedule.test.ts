import { describe, expect, it } from 'vitest';
import { endDateFromSpan, firstDue, isFinished, nextAfter, todayBangkok } from '../domain/schedule';
import { schedulerInput } from '@/shared/contracts/schedulers';

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);
const monthly = (anchorDay: number, interval = 1) => ({ anchorDay, frequency: 'monthly' as const, interval });

describe('schedule date math', () => {
  it('clamps month-end and returns to the anchor day', () => {
    const c = monthly(31);
    const feb = nextAfter(d('2026-01-31'), c);
    expect(iso(feb)).toBe('2026-02-28');
    expect(iso(nextAfter(feb, c))).toBe('2026-03-31');
    expect(iso(nextAfter(d('2028-01-31'), c))).toBe('2028-02-29');
  });
  it('steps every N days, weeks, months and years', () => {
    expect(iso(nextAfter(d('2026-10-30'), { anchorDay: 30, frequency: 'daily', interval: 3 }))).toBe('2026-11-02');
    expect(iso(nextAfter(d('2026-10-23'), { anchorDay: 23, frequency: 'weekly', interval: 2 }))).toBe('2026-11-06');
    expect(iso(nextAfter(d('2026-11-15'), monthly(15, 2)))).toBe('2027-01-15');
    expect(iso(nextAfter(d('2028-02-29'), { anchorDay: 29, frequency: 'yearly', interval: 1 }))).toBe('2029-02-28');
  });
  it('picks the first due date on or after today without back-filling', () => {
    expect(iso(firstDue(d('2026-10-05'), d('2026-10-10'), monthly(5)))).toBe('2026-11-05');
    expect(iso(firstDue(d('2026-10-10'), d('2026-10-10'), monthly(10)))).toBe('2026-10-10');
    expect(iso(firstDue(d('2026-12-01'), d('2026-10-10'), monthly(1)))).toBe('2026-12-01');
  });
  it('computes an inclusive end date from a span, counting the start period as the first', () => {
    expect(iso(endDateFromSpan(d('2026-10-01'), 4, 'weeks'))).toBe('2026-10-28');
    expect(iso(endDateFromSpan(d('2026-10-01'), 6, 'years'))).toBe('2032-09-30');
    // N periods give exactly N runs.
    const runs = (start: string, frequency: 'weekly' | 'monthly' | 'yearly', value: number, unit: 'weeks' | 'months' | 'years') => {
      const end = endDateFromSpan(d(start), value, unit);
      const cadence = { anchorDay: d(start).getUTCDate(), frequency, interval: 1 };
      let n = 0;
      for (let due = d(start); due <= end; due = nextAfter(due, cadence)) n++;
      return n;
    };
    expect(runs('2026-10-01', 'monthly', 5, 'months')).toBe(5);
    expect(runs('2026-01-31', 'monthly', 1, 'months')).toBe(1);
    expect(runs('2026-10-01', 'weekly', 4, 'weeks')).toBe(4);
    expect(runs('2026-10-12', 'yearly', 6, 'years')).toBe(6);
  });
  it('decides when a Scheduler is finished', () => {
    expect(isFinished({ type: 'never' }, 99, d('2030-01-01'))).toBe(false);
    expect(isFinished({ type: 'count', count: 3 }, 2, d('2026-11-01'))).toBe(false);
    expect(isFinished({ type: 'count', count: 3 }, 3, d('2026-11-01'))).toBe(true);
    expect(isFinished({ type: 'endDate', endDate: d('2026-12-31') }, 1, d('2026-12-31'))).toBe(false);
    expect(isFinished({ type: 'endDate', endDate: d('2026-12-31') }, 1, d('2027-01-01'))).toBe(true);
  });
  it('uses the Bangkok calendar date', () => {
    expect(iso(todayBangkok(new Date('2026-10-23T16:59:00Z')))).toBe('2026-10-23');
    expect(iso(todayBangkok(new Date('2026-10-23T17:00:00Z')))).toBe('2026-10-24');
  });
});

describe('schedulerInput', () => {
  const base = { walletId: '507f1f77bcf86cd799439011', type: 'expense', amount: 10, title: 'YouTube', startDate: '2026-10-23', frequency: 'monthly', interval: 1, end: { type: 'never' } };
  it('enforces per-unit interval bounds and end date order', () => {
    expect(schedulerInput.safeParse(base).success).toBe(true);
    expect(schedulerInput.safeParse({ ...base, interval: 61 }).success).toBe(false);
    expect(schedulerInput.safeParse({ ...base, frequency: 'yearly', interval: 6 }).success).toBe(false);
    expect(schedulerInput.safeParse({ ...base, end: { type: 'endDate', endDate: '2026-10-22' } }).success).toBe(false);
    expect(schedulerInput.safeParse({ ...base, amount: 0 }).success).toBe(false);
  });
});
