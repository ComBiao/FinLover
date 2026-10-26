/**
 * Money to whole satang; summing integers avoids floating-point drift (0.1 + 0.2). toPrecision
 * drops binary noise first, so 1.005 * 100 = 100.49999999999999 still rounds up to 101.
 */
export const toCents = (amount: number) => Math.sign(amount) * Math.round(Number((Math.abs(amount) * 100).toPrecision(15)));
export const fromCents = (cents: number) => cents / 100;

/** Money rounded to at most 2 decimal places, half away from zero. */
export const roundMoney = (amount: number) => fromCents(toCents(amount));

/**
 * Percentages with one decimal place that add up to exactly 100.0 (largest remainder method).
 * Amounts are non-negative integers (cents), so the arithmetic is exact; all zeros yields zeros.
 * Ties go to the earlier entry.
 */
export function largestRemainderPercentages(amounts: number[]) {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  if (total <= 0) return amounts.map(() => 0);
  // Work in tenths of a percent: 1000 units make 100.0%.
  const units = amounts.map(amount => Math.floor((amount * 1000) / total));
  let remaining = 1000 - units.reduce((sum, unit) => sum + unit, 0);
  const byRemainder = amounts.map((amount, index) => ({ index, remainder: (amount * 1000) % total })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (remaining <= 0) break;
    units[index] += 1;
    remaining -= 1;
  }
  return units.map(unit => unit / 10);
}
