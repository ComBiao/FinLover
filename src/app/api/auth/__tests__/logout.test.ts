import { describe, it, expect, vi, beforeEach } from "vitest";

// server-only throws unless Next.js's bundler marks the module as server-side;
// vitest never does, so neutralize it (same reason as session.test.ts).
vi.mock("server-only", () => ({}));

// next/headers' cookies() only works inside a live Next.js request context.
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { cookies } from "next/headers";
import { POST } from "@/app/api/auth/logout/route";
import { SESSION_COOKIE_NAME } from "@/lib/session";

type Store = {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

function mockCookieStore(existingToken?: string): Store {
  const store: Store = {
    get: vi.fn((name: string) =>
      name === SESSION_COOKIE_NAME && existingToken !== undefined
        ? { name, value: existingToken }
        : undefined
    ),
    set: vi.fn(),
    delete: vi.fn(),
  };
  vi.mocked(cookies).mockResolvedValue(
    store as unknown as Awaited<ReturnType<typeof cookies>>
  );
  return store;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/logout", () => {
  it("AC1 — clears the session cookie and returns 200 { success: true }", async () => {
    const store = mockCookieStore("a.valid.looking.token");

    const res = await POST();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
    expect(store.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });

  it("AC2 — idempotent: still succeeds when no session cookie is present", async () => {
    const store = mockCookieStore(undefined);

    const res = await POST();

    expect(res.status).toBe(200);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(500);
    await expect(res.json()).resolves.toEqual({ success: true });
    // delete() on an absent cookie is a harmless no-op, still invoked.
    expect(store.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });

  it("AC4 — needs no request body or credentials to call", async () => {
    mockCookieStore(undefined);

    // POST takes no argument at all — no body is read, nothing is validated.
    await expect(POST()).resolves.toBeDefined();
  });

  it("only deletes the session cookie — never writes a new one", async () => {
    const store = mockCookieStore("a.valid.looking.token");

    await POST();

    expect(store.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
    // Logout must not issue a replacement token (e.g. a blank cookie via
    // set() with maxAge 0, or an accidental re-sign). Asserting on the
    // mutation, not the response header, since the mocked store does not
    // wire cookie writes into NextResponse — a header assertion here would
    // pass even for a broken route. End-to-end Set-Cookie verification
    // belongs in an integration test against a running server.
    expect(store.set).not.toHaveBeenCalled();
  });
});
