import { AsyncLocalStorage } from 'node:async_hooks';
import type { Handler, RouteContext } from './policy';
const requestLog = new AsyncLocalStorage<{ requestId: string }>();
/** Log transport metadata only; never credentials, bodies, query strings or user data. */
export function logged(handler: Handler) {
  return async (request: Request, context: RouteContext = { params: Promise.resolve({ id: '' }) }) => {
    const started = Date.now();
    const requestId = crypto.randomUUID();
    return requestLog.run({ requestId }, async () => {
      let status = 500;
      try {
        const response = await handler(request, context);
        status = response.status;
        response.headers.set('x-request-id', requestId);
        return response;
      } catch (error) {
        logError(error);
        throw error;
      } finally {
        console.info(JSON.stringify({ requestId, path: new URL(request.url).pathname, method: request.method, status, duration: Date.now() - started }));
      }
    });
  };
}

/** Error messages/properties can contain credentials or financial values. Keep type,
 * driver code and stack locations, excluding the message and attached payloads. */
export function logError(error: unknown) {
  const diagnostic = error instanceof Error ? {
    name: /^[A-Za-z]+Error$/.test(error.name) ? error.name : 'Error',
    stack: error.stack?.split('\n').filter(line => /^\s+at /.test(line)).join('\n'),
    ...('code' in error && typeof error.code === 'number' ? { code: error.code } : {}),
  } : { name: 'UnknownError' };
  console.error('API request failed', { ...requestLog.getStore(), ...diagnostic });
}
