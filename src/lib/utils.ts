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
  return toLocalISODate(new Date())
}

/**
 * Formats a `Date` as a local YYYY-MM-DD string — not `toISOString()`,
 * which converts to UTC first and can shift the date by a day in any
 * timezone ahead of UTC.
 */
export function toLocalISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const ENGLISH_SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const

/** English day and three-letter month, e.g. `11 Oct`, independent of browser locale. */
export function formatEnglishDayMonth(date: Date) {
  return `${date.getDate()} ${ENGLISH_SHORT_MONTHS[date.getMonth()]}`
}

/** English display date in day-first order, e.g. `11 Oct 2026`. */
export function formatEnglishDate(date: Date) {
  return `${formatEnglishDayMonth(date)} ${date.getFullYear()}`
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
