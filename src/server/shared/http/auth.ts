import { verifyToken } from '@/server/shared/auth/crypto';
export interface AuthenticatedPrincipal { userId: string; source: 'bearer' | 'cookie' }
/** A single verifier for every API version. An explicit bad header never falls back. */
export function resolvePrincipal(request: Request): AuthenticatedPrincipal | null {
  const header = request.headers.get('authorization');
  const source = header === null ? 'cookie' : 'bearer';
  let token: string | undefined;
  if (source === 'bearer') token = header?.match(/^Bearer ([^\s]+)$/)?.[1];
  else {
    const cookie = request.headers.get('cookie')?.split(';').map(value => value.trim()).find(value => value.startsWith('session_token='));
    try { token = cookie ? decodeURIComponent(cookie.slice('session_token='.length)) : undefined; } catch { return null; }
  }
  if (!token) return null;
  try {
    const payload = verifyToken<{ userId?: unknown }>(token);
    return typeof payload.userId === 'string' && /^[a-f0-9]{24}$/i.test(payload.userId) ? { userId: payload.userId, source } : null;
  } catch { return null; }
}

/** Looks up whether the account behind a verified token still exists. */
export type AccountExists = (userId: string) => Promise<boolean>;

/**
 * Resolves the principal, then confirms its account still exists, so tokens
 * belonging to deleted users stop working on every protected endpoint.
 * Token checks run first, so missing, forged or expired credentials never reach
 * the database. A failing lookup throws (a 500) instead of counting as
 * unauthenticated, so a database outage doesn't log everyone out.
 */
export async function resolveActivePrincipal(
  request: Request,
  accountExists: AccountExists,
): Promise<AuthenticatedPrincipal | null> {
  const principal = resolvePrincipal(request);
  if (!principal) return null;
  return (await accountExists(principal.userId)) ? principal : null;
}