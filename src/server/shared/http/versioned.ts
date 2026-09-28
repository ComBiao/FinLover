import { logError, logged } from './logging';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validationFields } from './errors';
import { secure, type Handler, type RouteContext, type Policy } from './policy';
type Options = Policy & { schema?: z.ZodType; input?: (value: Record<string, unknown>) => unknown; output?: (value: Record<string, unknown>) => unknown };
/** Version mapping only: auth/CSRF policies and principal are shared with legacy. */
export function versioned(handler: Handler, options: Options = {}) {
  const execute = secure(async (request, context) => {
    if (!options.schema) return handler(request, context);
    let raw: unknown;
    try { raw = await request.json(); } catch { return NextResponse.json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } }, { status: 400 }); }
    const parsed = options.schema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'One or more fields are invalid', fields: validationFields(parsed.error) } }, { status: 400 });
    const headers = new Headers(request.headers); headers.delete('content-length'); headers.set('content-type', 'application/json');
    const body = JSON.stringify(options.input ? options.input(parsed.data as Record<string, unknown>) : parsed.data);
    return handler(new Request(request.url, { method: request.method, headers, body }), context);
  }, options);
  return logged(async (request: Request, context: RouteContext) => {
    const path = new URL(request.url).pathname;
    try {
      const response = await execute(request, context);
      const payload = response.status === 204 ? null : await response.json();
      const headers = new Headers(response.headers); headers.delete('content-length');
      if (!response.ok) {
        const error = payload?.error ?? { code: 'INTERNAL_ERROR', message: 'Internal server error' };
        if (error.fields) error.fields = Object.fromEntries(Object.entries(error.fields).map(([key, value]) => [{ wallet_id: 'walletId', category_id: 'categoryId' }[key] ?? key, value]));
        return NextResponse.json({ status: false, error, timestamp: new Date().toISOString(), path }, { status: response.status === 422 ? 400 : response.status, headers });
      }
      const value = payload?.data ?? payload;
      return NextResponse.json({ status: true, data: options.output && value ? options.output(value) : value }, { status: response.status === 204 ? 200 : response.status, headers });
    } catch (error) { logError(error); return NextResponse.json({ status: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }, timestamp: new Date().toISOString(), path }, { status: 500 }); }
  });
}
