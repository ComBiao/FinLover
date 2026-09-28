import { NextResponse } from 'next/server';
import { resolvePrincipal, type AuthenticatedPrincipal } from './auth';
import { publicOrigins } from '@/server/shared/config/env';
export interface RouteContext { params: Promise<{ id: string }>; principal?: AuthenticatedPrincipal }
export type Handler = (request: Request, context: RouteContext) => Promise<Response>;
export interface Policy { protected?: boolean; browserAuth?: boolean }
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
    return handler(request, { ...context, principal: principal ?? undefined });
  };
}
