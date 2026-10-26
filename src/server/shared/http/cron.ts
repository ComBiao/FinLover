import { createHash, timingSafeEqual } from 'node:crypto';

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. With no secret configured nothing is authorized. */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  if (!secret || !header) return false;
  // Hash both sides so the comparison is constant-time regardless of length.
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}
