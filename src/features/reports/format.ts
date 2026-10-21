/**
 * Report money: always two decimals (`฿45,000.00`), unlike `formatBaht` in
 * `@/lib/utils`, which drops `.00` on whole amounts. The reports acceptance
 * criteria spell amounts with cents, so they get their own formatter.
 * Negatives get a leading `-`; with `sign: true`, positives get a leading `+`.
 */
export function formatBahtFixed(amount: number, options?: { sign?: boolean }) {
  const rounded = Math.round(amount * 100) / 100;
  const body = `฿${Math.abs(rounded).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  if (rounded < 0) return `-${body}`;
  if (options?.sign && rounded > 0) return `+${body}`;
  return body;
}

const COMPACT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** Short axis label such as `฿45K` or `฿1.2M`. */
export function formatBahtCompact(amount: number) {
  return `${amount < 0 ? "-" : ""}฿${COMPACT.format(Math.abs(amount))}`;
}
