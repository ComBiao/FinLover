import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, getApi } from '@/lib/api/client';

const jsonResponse = (payload: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(payload),
});

afterEach(() => vi.unstubAllGlobals());

describe('getApi', () => {
  it.each([null, 'invalid', 42, true])('rejects non-object JSON payloads (%j)', async payload => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)));

    await expect(getApi('/api/v1/test')).rejects.toBeInstanceOf(ApiClientError);
  });

  it('returns data from a valid response object', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status: true, data: { value: 7 } })));

    await expect(getApi<{ value: number }>('/api/v1/test')).resolves.toEqual({ value: 7 });
  });

  it('preserves API error details from a valid response object', async () => {
    const error = { code: 'VALIDATION_ERROR', message: 'Invalid request', fields: { name: 'Required' } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status: false, error }, false, 422)));

    await expect(getApi('/api/v1/test')).rejects.toMatchObject({
      message: 'Invalid request',
      status: 422,
      fields: { name: 'Required' },
    });
  });
});
