import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, getApi } from '../client';

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
