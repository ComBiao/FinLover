import { describe, expect, it } from 'vitest';
import { AppError } from '@/server/shared/kernel/AppError';
import { assertBucketLimit, bucketCount, buildBuckets, MAX_BUCKETS, suggestedInterval, totalsPerBucket } from '../services/report-period';

describe('buildBuckets', () => {
  it('builds one daily bucket per day, across a month and a year end', () => {
    expect(buildBuckets('2026-12-30', '2027-01-02', 'daily')).toEqual([
      { label: '2026-12-30', start: '2026-12-30', end: '2026-12-30' },
      { label: '2026-12-31', start: '2026-12-31', end: '2026-12-31' },
      { label: '2027-01-01', start: '2027-01-01', end: '2027-01-01' },
      { label: '2027-01-02', start: '2027-01-02', end: '2027-01-02' },
    ]);
  });

  it('starts weeks on Monday and clips the first and last week to the range', () => {
    // 2026-10-01 is a Thursday; 2026-10-15 is a Thursday.
    expect(buildBuckets('2026-10-01', '2026-10-15', 'weekly')).toEqual([
      { label: '2026-10-01', start: '2026-10-01', end: '2026-10-04' },
      { label: '2026-10-05', start: '2026-10-05', end: '2026-10-11' },
      { label: '2026-10-12', start: '2026-10-12', end: '2026-10-15' },
    ]);
  });

  it('keeps a week that spans a year end in one bucket', () => {
    // 2026-12-28 is a Monday.
    expect(buildBuckets('2026-12-28', '2027-01-04', 'weekly')).toEqual([
      { label: '2026-12-28', start: '2026-12-28', end: '2027-01-03' },
      { label: '2027-01-04', start: '2027-01-04', end: '2027-01-04' },
    ]);
  });

  it('starts a range that begins on a Sunday with a one-day week', () => {
    expect(buildBuckets('2026-10-04', '2026-10-05', 'weekly')).toEqual([
      { label: '2026-10-04', start: '2026-10-04', end: '2026-10-04' },
      { label: '2026-10-05', start: '2026-10-05', end: '2026-10-05' },
    ]);
  });

  it('labels months YYYY-MM, clips the edges and handles February and year ends', () => {
    expect(buildBuckets('2027-11-15', '2028-03-10', 'monthly')).toEqual([
      { label: '2027-11', start: '2027-11-15', end: '2027-11-30' },
      { label: '2027-12', start: '2027-12-01', end: '2027-12-31' },
      { label: '2028-01', start: '2028-01-01', end: '2028-01-31' },
      { label: '2028-02', start: '2028-02-01', end: '2028-02-29' },
      { label: '2028-03', start: '2028-03-01', end: '2028-03-10' },
    ]);
  });

  it('returns a single bucket for a one-day range', () => {
    for (const interval of ['daily', 'weekly'] as const) {
      expect(buildBuckets('2026-10-07', '2026-10-07', interval)).toEqual([{ label: '2026-10-07', start: '2026-10-07', end: '2026-10-07' }]);
    }
    expect(buildBuckets('2026-10-07', '2026-10-07', 'monthly')).toEqual([{ label: '2026-10', start: '2026-10-07', end: '2026-10-07' }]);
  });

  it('agrees with bucketCount', () => {
    for (const [start, end] of [['2026-01-01', '2026-12-31'], ['2026-10-04', '2027-03-01'], ['2024-02-29', '2028-02-29']]) {
      for (const interval of ['daily', 'weekly', 'monthly'] as const) {
        expect(buildBuckets(start, end, interval)).toHaveLength(bucketCount(start, end, interval));
      }
    }
  });
});

describe('suggestedInterval', () => {
  it.each([
    ['2026-10-01', '2026-10-01', 'daily'],
    ['2026-10-01', '2026-10-31', 'daily'],
    ['2026-10-01', '2026-11-01', 'weekly'],
    ['2026-09-01', '2026-12-29', 'weekly'],
    ['2026-09-01', '2026-12-30', 'monthly'],
  ])('%s to %s suggests %s', (start, end, interval) => {
    expect(suggestedInterval(start, end)).toBe(interval);
  });
});

describe('assertBucketLimit', () => {
  it(`allows exactly ${MAX_BUCKETS} buckets and rejects one more with fields.interval`, () => {
    expect(bucketCount('2026-01-01', '2027-02-04', 'daily')).toBe(400);
    expect(() => assertBucketLimit('2026-01-01', '2027-02-04', 'daily')).not.toThrow();
    let error: unknown;
    try { assertBucketLimit('2026-01-01', '2027-02-05', 'daily'); } catch (caught) { error = caught; }
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR', fields: { interval: expect.any(String) } });
    expect(() => assertBucketLimit('2026-01-01', '2027-02-05', 'weekly')).not.toThrow();
  });
});

describe('totalsPerBucket', () => {
  it('adds each day to its bucket in whole cents and leaves empty buckets at zero', () => {
    const buckets = buildBuckets('2026-10-01', '2026-10-15', 'weekly');
    const totals = totalsPerBucket(buckets, [
      { date: '2026-10-01', income: 0.1, expense: 0 },
      { date: '2026-10-04', income: 0.2, expense: 5 },
      { date: '2026-10-15', income: 0, expense: 1.25 },
    ]);
    expect(totals.map(({ income, expense }) => [income, expense])).toEqual([[30, 500], [0, 0], [0, 125]]);
  });
});
