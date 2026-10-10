import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureAccountCheck, secure, type RouteContext } from '../policy';
import { signToken } from '@/server/shared/auth/crypto';
const id = '507f1f77bcf86cd799439011';
const token = signToken({ userId: id });
const cookie = `session_token=${token}`;
const origin = 'http://localhost:3000';
const handler = vi.fn(async (_request: Request, context: RouteContext) => Response.json(context.principal ?? { public: true }));
const protectedRoute = secure(handler, { protected: true });
const browserAuth = secure(handler, { browserAuth: true });
const request = (headers: Record<string, string>, body?: string) => new Request(`${origin}/api/categories`, { method: 'POST', headers, body });
beforeEach(() => {
  vi.unstubAllEnvs(); vi.clearAllMocks();
  vi.stubEnv('PUBLIC_ORIGINS', origin);
  vi.stubEnv('VERCEL_ENV', 'development');
  configureAccountCheck(async () => true);
});
describe('shared principal and mutation policy', () => {
  it('accepts cookie and returns one principal without synthesizing Authorization', async () => {
    const result = await protectedRoute(request({ cookie, origin }));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ userId: id, source: 'cookie' });
    expect(handler.mock.calls[0][0].headers.has('authorization')).toBe(false);
  });
  it('accepts verified Bearer without Origin and prefers it to cookie', async () => {
    const result = await protectedRoute(request({ cookie: 'session_token=invalid', authorization: `Bearer ${token}` }));
    expect(await result.json()).toEqual({ userId: id, source: 'bearer' });
  });
  it.each(['Bearer invalid', 'Basic invalid', ''])('rejects explicit invalid header %s despite valid cookie', async authorization => {
    expect((await protectedRoute(request({ authorization, cookie, origin }))).status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });
  it.each([undefined, 'null', 'https://attacker.example', 'http://localhost:3000/', 'http://localhost:3000.attacker.example', 'http://localhost:3001'])('rejects unsafe cookie Origin %s', async value => {
    const headers: Record<string, string> = { cookie };
    if (value !== undefined) headers.origin = value;
    expect((await protectedRoute(request(headers))).status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
  it('requires Origin for login/register/logout even without cookies or with Bearer', async () => {
    for (const headers of [{}, { authorization: `Bearer ${token}` }, { origin: 'null' }] as Record<string,string>[]) expect((await browserAuth(request(headers))).status).toBe(403);
    expect((await browserAuth(request({ origin }))).status).toBe(200);
  });
  it('rejects non-JSON cookie writes before entering a handler', async () => {
    expect((await protectedRoute(request({ cookie, origin, 'content-type': 'text/plain' }, '{}'))).status).toBe(415);
    expect(handler).not.toHaveBeenCalled();
    expect((await protectedRoute(request({ cookie, origin, 'content-type': 'application/json' }, '{}'))).status).toBe(200);
  });
  it('allows safe authenticated reads without Origin', async () => {
    expect((await protectedRoute(new Request(`${origin}/api/example`, { headers: { cookie } }))).status).toBe(200);
  });
  it('uses exact deployment/branch origins in preview, not production, wildcard or Host headers', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('VERCEL_URL', 'finlover-current.vercel.app'); vi.stubEnv('VERCEL_BRANCH_URL', 'finlover-git-feature.vercel.app');
    vi.stubEnv('PREVIEW_ORIGINS', ''); vi.stubEnv('PUBLIC_ORIGINS', 'https://finlover.example');
    for (const allowed of ['https://finlover-current.vercel.app', 'https://finlover-git-feature.vercel.app']) expect((await protectedRoute(request({ cookie, origin: allowed }))).status).toBe(200);
    for (const denied of ['https://finlover-other.vercel.app', 'https://finlover.example', 'https://attacker.example']) expect((await protectedRoute(request({ cookie, origin: denied, host: 'attacker.example', 'x-forwarded-host': 'attacker.example' }))).status).toBe(403);
  });
});
