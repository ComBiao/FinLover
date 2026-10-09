import { z } from 'zod';
const serverEnvironment = z.object({ MONGODB_URI: z.string().min(1), JWT_SECRET: z.string().min(1) });
export function serverEnv() { return serverEnvironment.parse(process.env); }
export function publicOrigins() {
  // Deployment metadata is platform configuration, never inferred from request headers.
  const preview = process.env.VERCEL_ENV === 'preview';
  const configured = preview ? process.env.PREVIEW_ORIGINS : process.env.PUBLIC_ORIGINS;
  const values = configured?.split(',').map(value => value.trim()).filter(Boolean) ?? [];
  if (preview) for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
    if (host && /^[a-zA-Z0-9.-]+$/.test(host)) values.push(`https://${host}`);
  }
  return new Set(values.map(value => new URL(value).origin));
}

export function jwtSecret() { return z.string().min(1, "Missing JWT_SECRET").parse(process.env.JWT_SECRET); }

let cachedApplicationTimezone: { source: string | undefined; value: string } | undefined;
export function applicationTimezone() {
  const source = process.env.APPLICATION_TIMEZONE;
  const cached = cachedApplicationTimezone;
  if (cached && cached.source === source) return cached.value;
  const timezone = source?.trim() || 'Asia/Bangkok';
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(); }
  catch { throw new Error('APPLICATION_TIMEZONE must be a valid IANA timezone'); }
  cachedApplicationTimezone = { source, value: timezone };
  return timezone;
}
