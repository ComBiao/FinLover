import type { Handler, RouteContext } from './policy';
/** Log transport metadata only; never credentials, bodies, query strings or user data. */
export function logged(handler: Handler) {
  return async (request: Request, context: RouteContext = { params: Promise.resolve({ id: '' }) }) => {
    const started = Date.now();
    const requestId = crypto.randomUUID();
    let status = 500;
    try {
      const response = await handler(request, context);
      status = response.status;
      response.headers.set('x-request-id', requestId);
      return response;
    } finally {
      console.info(JSON.stringify({ requestId, path: new URL(request.url).pathname, method: request.method, status, duration: Date.now() - started }));
    }
  };
}
