import { describe, it, expect, vi, beforeEach } from "vitest";
import { signToken } from "@/server/shared/auth/crypto";
import { NextRequest } from "next/server";

// connectDB and the User model touch a real database -- mocked the same
// way login/logout's own tests mock theirs.
vi.mock("@/server/db/index", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/db/models/User", () => ({
  default: { findOneAndDelete: vi.fn() },
}));

// Only clearSessionCookie is replaced -- everything else this module
// exports (nothing else is used here) stays real. A full mock-replace
// (like login.test.ts does for setSessionCookie) would be fine too, but
// this project doesn't need anything else from the module in this file.
vi.mock("@/server/shared/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/shared/auth/session")>();
  return { ...actual, clearSessionCookie: vi.fn().mockResolvedValue(undefined) };
});

// MongoUnitOfWork.run() calls mongoose.startSession() for real, which
// needs a live, replica-set-enabled connection -- login/logout never
// exercise a UnitOfWork at all, so this mock has no precedent to copy from.
// Replaced with a pass-through so the real Controller/Service/Repository
// logic still runs, just without touching an actual database.
vi.mock("@/server/db/unit-of-work", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/db/unit-of-work")>()),
  MongoUnitOfWork: class {
    run<T>(work: (context: { session: undefined }) => Promise<T>) {
      return work({ session: undefined });
    }
  },
}));

import { DELETE } from "@/app/api/v1/auth/delete-account/route";
import User from "@/server/db/models/User";
import { clearSessionCookie } from "@/server/shared/auth/session";

// A valid-looking ObjectId: resolvePrincipal() requires /^[a-f0-9]{24}$/i
// on the token's userId claim, or it treats the token as invalid.
const VALID_USER_ID = "507f1f77bcf86cd799439011";

function signSessionToken(userId: string = VALID_USER_ID) {
  return signToken({ userId });
}

function deleteAccountRequest({ cookieToken, bearerToken, origin }: {
  cookieToken?: string;
  bearerToken?: string;
  origin?: string;
} = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (cookieToken) headers.cookie = `session_token=${cookieToken}`;
  if (bearerToken) headers.authorization = `Bearer ${bearerToken}`;
  if (origin) headers.origin = origin;

  return new NextRequest("http://localhost/api/v1/auth/delete-account", {
    method: "DELETE",
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("DELETE /api/auth/delete-account", () => {
  it("valid, cookie-authenticated: deletes the account, clears the cookie, returns success", async () => {
    const token = signSessionToken();
    vi.mocked(User.findOneAndDelete).mockResolvedValue({ _id: VALID_USER_ID } as never);

    const res = await DELETE(
      deleteAccountRequest({ cookieToken: token, origin: "http://localhost" })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: true, data: { success: true } });
    expect(User.findOneAndDelete).toHaveBeenCalledWith(
      { _id: VALID_USER_ID },
      { session: undefined }
    );
    expect(clearSessionCookie).toHaveBeenCalled();
  });

  it("valid, Bearer-authenticated: succeeds with no Origin header needed", async () => {
    const token = signSessionToken();
    vi.mocked(User.findOneAndDelete).mockResolvedValue({ _id: VALID_USER_ID } as never);

    // Deliberately no `origin` set -- a Bearer-sourced principal isn't a
    // cookie mutation, so secure() shouldn't require one here, unlike the
    // cookie-authenticated case above.
    const res = await DELETE(deleteAccountRequest({ bearerToken: token }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: true, data: { success: true } });
  });

  it("no credentials at all -> 401, rejected before the handler ever runs", async () => {
    const res = await DELETE(deleteAccountRequest({ origin: "http://localhost" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(User.findOneAndDelete).not.toHaveBeenCalled();
    expect(clearSessionCookie).not.toHaveBeenCalled();
  });

  it("cookie-authenticated but missing a trusted Origin -> 403, never reaches the handler", async () => {
    const token = signSessionToken();

    const res = await DELETE(deleteAccountRequest({ cookieToken: token })); // no origin
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(User.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("stale session (user already gone) -> 404, but the cookie is still cleared", async () => {
    const token = signSessionToken();
    vi.mocked(User.findOneAndDelete).mockResolvedValue(null);

    const res = await DELETE(
      deleteAccountRequest({ cookieToken: token, origin: "http://localhost" })
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(clearSessionCookie).toHaveBeenCalled();
  });

  it("database failure -> 500 INTERNAL_ERROR, not an unhandled exception, cookie left alone", async () => {
    const token = signSessionToken();
    vi.mocked(User.findOneAndDelete).mockRejectedValue(new Error("connection lost"));

    const res = await DELETE(
      deleteAccountRequest({ cookieToken: token, origin: "http://localhost" })
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(clearSessionCookie).not.toHaveBeenCalled();
  });
});