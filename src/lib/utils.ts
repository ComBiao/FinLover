import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges Tailwind CSS class names using clsx and tailwind-merge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Today's date as YYYY-MM-DD, from local time — not `toISOString()`, which
 * converts to UTC first and can land on the wrong day near midnight.
 */
export function todayISODate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`
}

/**
 * Formats a baht amount: rounded to 2 decimals first, then `฿1,304` for a whole
 * number or `฿1,304.50` when it has cents. Negatives get a leading `-`; with
 * `sign: true`, positives get a leading `+`.
 */
export function formatBaht(amount: number, options?: { sign?: boolean }) {
  const rounded = Math.round(amount * 100) / 100
  const abs = Math.abs(rounded)
  const hasFraction = abs % 1 !== 0
  const body = `฿${abs.toLocaleString("en-US", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
  if (rounded < 0) return `-${body}`
  if (options?.sign && rounded > 0) return `+${body}`
  return body
}
