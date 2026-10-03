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
