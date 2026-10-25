import { describe, expect, it } from 'vitest';
import { largestRemainderPercentages, roundMoney } from '../services/report-math';

const sum = (values: number[]) => Math.round(values.reduce((total, value) => total + value, 0) * 10) / 10;

describe('largestRemainderPercentages', () => {
  it('rounds to one decimal place and adds up to exactly 100.0', () => {
    const result = largestRemainderPercentages([1, 1, 1]);
    expect(result).toEqual([33.4, 33.3, 33.3]);
    expect(sum(result)).toBe(100);
  });

  it('gives leftover tenths to the largest remainders first', () => {
    // 40000/45000 = 88.888…, 5000/45000 = 11.111…
    expect(largestRemainderPercentages([4_000_000, 500_000])).toEqual([88.9, 11.1]);
    // 2/3 = 66.666…, 1/6 = 16.666… twice: the larger remainder wins, then earlier entries on ties
    expect(largestRemainderPercentages([4, 1, 1])).toEqual([66.7, 16.7, 16.6]);
  });

  it('adds up to 100.0 for many uneven amounts', () => {
    const amounts = [123_457, 98_765, 4_321, 1, 77, 50_000, 3];
    expect(sum(largestRemainderPercentages(amounts))).toBe(100);
  });

  it('returns 100 for one entry and zeros when everything is zero', () => {
    expect(largestRemainderPercentages([999])).toEqual([100]);
    expect(largestRemainderPercentages([0, 0])).toEqual([0, 0]);
    expect(largestRemainderPercentages([])).toEqual([]);
  });
});

describe('roundMoney', () => {
  it('rounds to at most 2 decimal places, half away from zero', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(-1.005)).toBe(-1.01);
    expect(roundMoney(45000)).toBe(45000);
  });
});
