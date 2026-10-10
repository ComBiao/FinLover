import { NextResponse } from 'next/server';
import { resolvePrincipal, type AuthenticatedPrincipal } from './auth';
import { logError } from './logging';
import { publicOrigins } from '@/server/shared/config/env';
export interface RouteContext { params: Promise<{ id: string }>; principal?: AuthenticatedPrincipal }
export type Handler = (request: Request, context: RouteContext) => Promise<Response>;
export interface Policy {
  protected?: boolean;
  browserAuth?: boolean;
  /**
   * Skips the account-exists check. Only for delete-account, so a stale session
   * gets a 404 and its cookie is cleared instead of a bare 401.
   */
  allowMissingAccount?: boolean;
}

/** Looks up whether the account behind a verified token still exists. */
export type AccountExists = (userId: string) => Promise<boolean>;
let accountExists: AccountExists | undefined;

/**
 * Registers the account lookup that secure() runs for protected routes, so tokens
 * belonging to deleted users stop working. Called once by the composition root.
 */
export function configureAccountCheck(check: AccountExists) { accountExists = check; }

export function secure(handler: Handler, policy: Policy = {}) {
  return async (request: Request, context: RouteContext = { params: Promise.resolve({ id: '' }) }) => {
    const principal = policy.protected ? resolvePrincipal(request) : undefined;
    const error = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });
    if (policy.protected && !principal) return error(401, 'UNAUTHORIZED', 'Missing or invalid token');
    const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if (unsafe && (policy.browserAuth || principal?.source === 'cookie')) {
      const raw = request.headers.get('origin');
      let origin: string | undefined;
      try { if (raw && raw !== 'null') { const url = new URL(raw); if (raw === url.origin) origin = url.origin; } } catch { /* deny invalid origins */ }
      if (!origin || !publicOrigins().has(origin)) return error(403, 'FORBIDDEN', 'A trusted Origin is required');
      // DELETE/logout need not carry a body. Body-bearing cookie mutations are JSON only.
      if (request.body !== null && request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return error(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json');
    }
    // Last, so bad tokens and untrusted origins never cost a database read.
    if (principal && !policy.allowMissingAccount) {
      try {
        if (!accountExists) throw new Error('Account check is not configured');
        if (!(await accountExists(principal.userId))) return error(401, 'UNAUTHORIZED', 'Missing or invalid token');
      } catch (lookupError) {
        logError(lookupError); // a lookup failure is a 500, never a 401
        return error(500, 'INTERNAL_ERROR', 'Internal server error');
      }
    }
    return handler(request, { ...context, principal: principal ?? undefined });
  };
}
