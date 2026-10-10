import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, deleteApi, getApi, putApi } from '../client';

afterEach(() => vi.unstubAllGlobals());

describe('getApi', () => {
  it('preserves an HTTP error when an error response is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 })));

    await expect(getApi('/api/v1/wallets')).rejects.toEqual(
      expect.objectContaining({
        message: 'Request failed',
        status: 502,
      })
    );
  });

  it('continues to expose parsing errors for successful non-JSON responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json', { status: 200 })));

    await expect(getApi('/api/v1/wallets')).rejects.toBeInstanceOf(SyntaxError);
  });
});

describe('putApi / deleteApi', () => {
  it('sends the method, cookie credentials and JSON body, and returns data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: true, data: { id: '1' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(putApi('/api/v1/x/1', { a: 1 })).resolves.toEqual({ id: '1' });

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/x/1', expect.objectContaining({ method: 'PUT', credentials: 'same-origin', body: '{"a":1}' }));
  });

  it('treats the v1 null-data envelope as a successful delete', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: true, data: null }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(deleteApi('/api/v1/x/1')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/x/1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('throws ApiClientError with status and field errors on failure', async () => {
    // A Response body can only be read once, so build a fresh one per call.
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify({ status: false, error: { message: 'Bad', fields: { title: 'required' } } }), { status: 400 })));

    await expect(putApi('/api/v1/x/1', {})).rejects.toEqual(expect.objectContaining({ message: 'Bad', status: 400, fields: { title: 'required' } }));
    await expect(deleteApi('/api/v1/x/1')).rejects.toBeInstanceOf(ApiClientError);
  });
});
