import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashPassword } from "@/lib/auth";

// connectDB, setSessionCookie, and the User model all touch things a unit
// test shouldn't (a real database, a real Next.js request context) — mock
// each so this test exercises the route's own logic in isolation.
vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/session", () => ({
  setSessionCookie: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/models/User", () => ({
  default: { findOne: vi.fn() },
}));

import { POST } from "../login/route";
import User from "@/models/User";
import { setSessionCookie } from "@/lib/session";

function loginRequest(body: unknown) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

/**
 * A fake resolved user, shaped to satisfy Mongoose's typed Document (_id is
 * Types.ObjectId, not string) without importing Mongoose types here just for
 * a test double. Cast through unknown, same pattern as the cookies() mock in
 * session.test.ts.
 */
function fakeUser(overrides: { email?: string; passwordHash?: string } = {}) {
  return {
    _id: "user-1",
    email: "person@example.com",
    passwordHash: realPasswordHash,
    ...overrides,
  } as unknown as Awaited<ReturnType<typeof User.findOne>>;
}

const REAL_PASSWORD = "correct-horse-battery-staple";
let realPasswordHash: string;

beforeEach(async () => {
  vi.clearAllMocks();
  // Keep expected error-path logging out of the test output.
  vi.spyOn(console, "error").mockImplementation(() => {});
  // Real bcrypt hash, real comparePassword() calls throughout — only the
  // database and cookie layers are faked, so this suite actually proves the
  // login flow's password logic works, not just that mocks were wired up.
  realPasswordHash = await hashPassword(REAL_PASSWORD);
});

describe("POST /api/auth/login", () => {
  it("#13 AC1 — valid credentials return 200, set a session cookie, and exclude passwordHash", async () => {
    vi.mocked(User.findOne).mockResolvedValue(fakeUser());

    const res = await POST(
      loginRequest({ email: "person@example.com", password: REAL_PASSWORD })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ user: { id: "user-1", email: "person@example.com" } });
    expect(setSessionCookie).toHaveBeenCalledWith(expect.any(String));
  });

  it("#13 AC2 — wrong password returns a generic 401", async () => {
    vi.mocked(User.findOne).mockResolvedValue(fakeUser());

    const res = await POST(
      loginRequest({ email: "person@example.com", password: "wrong-password" })
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toEqual({
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    });
    expect(setSessionCookie).not.toHaveBeenCalled();
  });

  it("#13 AC3 — unknown email returns the identical 401 + error body as a wrong password", async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);

    const res = await POST(
      loginRequest({ email: "nobody@example.com", password: "anything" })
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toEqual({
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    });
    expect(setSessionCookie).not.toHaveBeenCalled();
  });

  it("#13 AC4 / #15 AC3 — a non-string password is rejected with 400 before any DB query", async () => {
    const res = await POST(
      loginRequest({ email: "person@example.com", password: 12345 })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("#13 AC5 — email matching is case-insensitive", async () => {
    vi.mocked(User.findOne).mockResolvedValue(fakeUser());

    await POST(loginRequest({ email: "PERSON@EXAMPLE.COM", password: REAL_PASSWORD }));

    expect(User.findOne).toHaveBeenCalledWith({ email: "person@example.com" });
  });

  it("#15 AC1 — well-formed email + non-empty password passes validation (reaches the DB, not a 400)", async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);

    const res = await POST(loginRequest({ email: "person@example.com", password: "x" }));

    expect(res.status).not.toBe(400);
    expect(User.findOne).toHaveBeenCalled();
  });

  it("#15 AC2 — an empty body is rejected with 400 identifying both missing fields", async () => {
    const res = await POST(loginRequest({}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.fields).toHaveProperty("email");
    expect(body.error.fields).toHaveProperty("password");
  });

  it("#15 AC4 — malformed JSON returns 400 with a generic message, not an unhandled exception", async () => {
    const res = await POST(loginRequest("{not valid json"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("INVALID_JSON");
  });

  it("#15 AC5 — validation failures (400) and credential failures (401) never share a status code", async () => {
    const validationRes = await POST(loginRequest({ password: "x" })); // missing email
    const validationBody = await validationRes.json();
    expect(validationRes.status).toBe(400);
    expect(validationBody.error.code).toBe("VALIDATION_ERROR");

    vi.mocked(User.findOne).mockResolvedValue(fakeUser());
    const credentialsRes = await POST(
      loginRequest({ email: "person@example.com", password: "wrong" })
    );
    const credentialsBody = await credentialsRes.json();
    expect(credentialsRes.status).toBe(401);
    expect(credentialsBody.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("#15 AC6 — a 10,000-character email is rejected by validation, never reaching the database", async () => {
    const hugeEmail = `${"a".repeat(10000)}@example.com`;

    const res = await POST(loginRequest({ email: hugeEmail, password: "x" }));

    expect(res.status).toBe(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("rejects a password over bcrypt's 72-byte comparison window, so a real password's suffix can't be bypassed", async () => {
    // REAL_PASSWORD is well under 72 bytes, so this isn't testing an actual
    // account — it's proving the cap itself works, independent of any
    // specific user's password length.
    const oversizedPassword = "a".repeat(73);

    const res = await POST(
      loginRequest({ email: "person@example.com", password: oversizedPassword })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("returns a generic 500 rather than an unhandled exception when the database call fails", async () => {
    vi.mocked(User.findOne).mockRejectedValue(new Error("connection lost"));

    const res = await POST(loginRequest({ email: "person@example.com", password: "x" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});