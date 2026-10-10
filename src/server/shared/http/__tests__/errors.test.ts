import { describe, expect, it, vi, afterEach } from 'vitest';
import { apiErrorResponse, validationFields } from '../errors';
import { logged } from '../logging';
import { categoryErrorResponse } from '../category-errors';
import { AppError } from '@/server/shared/kernel/AppError';
import { categoryInput, categoryUpdate } from '@/shared/contracts';
import { validateCategoryInput } from '@/server/modules/categories/middlewares/validators/input';

afterEach(() => vi.restoreAllMocks());
describe('shared error handling', () => {
  it('logs diagnostic type and stack without messages or attached private data', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = Object.assign(new Error('password=secret amount=987 token=jwt'), { request: { password: 'secret' }, code: 123 });
    const response = apiErrorResponse(error);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
    expect(log).toHaveBeenCalledWith('API request failed', expect.objectContaining({ name: 'Error', code: 123, stack: expect.stringContaining('errors.test.ts') }));
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/secret|987|jwt/);
  });
  it('correlates diagnostic logs with the response request ID', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const response = await logged(async () => apiErrorResponse(new Error('failure')))(new Request('http://localhost/api/test'));
    expect(log.mock.calls[0][1]).toMatchObject({ requestId: response.headers.get('x-request-id') });
  });
  it('category errors use the same internal envelope and diagnostic logger', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = categoryErrorResponse(new Error('internal'));
    expect(response.status).toBe(500);
    expect((await response.json()).error.code).toBe('INTERNAL_ERROR');
    expect(log).toHaveBeenCalledOnce();
  });
  it('preserves legacy validation status while mapping other application errors correctly', async () => {
    expect(apiErrorResponse(new AppError('VALIDATION_ERROR', 'invalid'), { validationStatus: 422 }).status).toBe(422);
    expect(apiErrorResponse(new AppError('FORBIDDEN', 'denied'), { validationStatus: 422 }).status).toBe(403);
    expect(apiErrorResponse(new AppError('NOT_FOUND', 'missing')).status).toBe(404);
  });
});
describe('category contract and service validation agree', () => {
  it.each([null, [], {}, { name: '   ', type: 'expense' }, { name: 'x'.repeat(51), type: 'income' }, { name: 'Food', type: 'invalid' }, { name: 'Food', type: 'expense', color: 'red' }, { name: 'Food', type: 'expense', icon: 'UnknownIcon' }, { name: '  Food  ', type: 'expense', color: '#aAbB00', icon: 'Utensils', isSystem: true }])('shares create/partial rules for %j', body => {
    for (const partial of [false, true]) {
      const parsed = (partial ? categoryUpdate : categoryInput).safeParse(body);
      if (parsed.success) expect(validateCategoryInput(body, partial)).toEqual(parsed.data);
      else {
        expect(() => validateCategoryInput(body, partial)).toThrow(expect.objectContaining({ code: 'VALIDATION_ERROR', fields: validationFields(parsed.error) }));
      }
    }
  });
});
