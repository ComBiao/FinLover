export class ApiClientError extends Error {
  constructor(message: string, public status: number, public fields?: Record<string, string>) { super(message); }
}
/** Browser credentials stay in the HttpOnly cookie; never copy a JWT to client storage. */
export async function postApi<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok || payload.status !== true) throw new ApiClientError(payload.error?.message ?? 'Request failed', response.status, payload.error?.fields);
  return payload.data as T;
}

export async function getApi<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin' });
  let payload: { status?: boolean; data?: unknown; error?: { message?: string; fields?: Record<string, string> } };
  try {
    payload = await response.json();
  } catch (error) {
    if (!response.ok) throw new ApiClientError('Request failed', response.status);
    throw error;
  }
  if (!response.ok || payload.status !== true) throw new ApiClientError(payload.error?.message ?? 'Request failed', response.status, payload.error?.fields);
  return payload.data as T;
}
