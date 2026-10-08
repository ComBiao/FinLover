import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { signToken } from "@/server/shared/auth/crypto";
import { NextRequest } from "next/server";

// connectDB and the User model touch a real database, so both are mocked.
vi.mock("@/server/db/index", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

// `exists` must be on the default export: UserRepository calls User.exists(...).
vi.mock("@/server/db/models/User", () => ({
  default: { findOneAndDelete: vi.fn(), exists: vi.fn() },
}));

// Only clearSessionCookie is replaced; everything else in the module stays real.
vi.mock("@/server/shared/auth/session", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/shared/auth/session")>();
  return {
    ...actual,
    clearSessionCookie: vi.fn().mockResolvedValue(undefined),
  };
});

// MongoUnitOfWork.run() needs a live replica set, so it is replaced with a
// pass-through; the real Controller/Service/Repository logic still runs.
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

// resolvePrincipal() requires /^[a-f0-9]{24}$/i on the token's userId claim.
const VALID_USER_ID = "507f1f77bcf86cd799439011";
const TRUSTED_ORIGIN = "http://localhost";

/** Signs a session JWT for the given user ID. */
function signSessionToken(userId: string = VALID_USER_ID) {
  return signToken({ userId });
}

/** Builds a DELETE request with optional cookie/Bearer credentials, Origin and JSON body. */
function deleteAccountRequest({
  cookieToken,
  bearerToken,
  origin,
  body,
}: {
  cookieToken?: string;
  bearerToken?: string;
  origin?: string;
  body?: unknown;
} = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (cookieToken) headers.cookie = `session_token=${cookieToken}`;
  if (bearerToken) headers.authorization = `Bearer ${bearerToken}`;
  if (origin) headers.origin = origin;
  if (body !== undefined) headers["content-type"] = "application/json";

  return new NextRequest("http://localhost/api/v1/auth/delete-account", {
    method: "DELETE",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** A well-formed browser request: valid session cookie and a trusted Origin. */
function cookieRequest(token: string = signSessionToken()) {
  return deleteAccountRequest({ cookieToken: token, origin: TRUSTED_ORIGIN });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  // Defaults for every test: the account exists, nothing else is configured.
  // clearAllMocks keeps implementations, so reset explicitly or they would leak.
  vi.mocked(User.exists).mockReset();
  vi.mocked(User.exists).mockResolvedValue({ _id: VALID_USER_ID } as never);
  vi.mocked(User.findOneAndDelete).mockReset();
});

describe("DELETE /api/v1/auth/delete-account", () => {
  it("valid, cookie-authenticated: deletes the account, clears the cookie, returns success", async () => {
    vi.mocked(User.findOneAndDelete).mockResolvedValue({
      _id: VALID_USER_ID,
    } as never);

    const res = await DELETE(cookieRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: true, data: { success: true } });
    expect(User.exists).not.toHaveBeenCalled();
    expect(User.findOneAndDelete).toHaveBeenCalledWith(
      { _id: VALID_USER_ID },
      { session: undefined },
    );
    expect(clearSessionCookie).toHaveBeenCalled();
  });

  it("needs no password: a request body, even a wrong password, is ignored", async () => {
    vi.mocked(User.findOneAndDelete).mockResolvedValue({
      _id: VALID_USER_ID,
    } as never);

    const res = await DELETE(
      deleteAccountRequest({
        cookieToken: signSessionToken(),
        origin: TRUSTED_ORIGIN,
        body: { password: "wrong" },
      }),
    );

    expect(res.status).toBe(200);
    expect(User.findOneAndDelete).toHaveBeenCalledTimes(1);
  });

  it("Bearer-authenticated: rejected with 401, nothing deleted, cookie untouched", async () => {
    const res = await DELETE(
      deleteAccountRequest({ bearerToken: signSessionToken() }),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toMatchObject({
      status: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(User.findOneAndDelete).not.toHaveBeenCalled();
    expect(clearSessionCookie).not.toHaveBeenCalled();
  });

  it.each([
    ["no credentials at all", () => deleteAccountRequest({ origin: TRUSTED_ORIGIN })],
    [
      "a tampered token",
      () => {
        const token = signSessionToken();
        const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
        return cookieRequest(tampered);
      },
    ],
    [
      "an expired token",
      () =>
        cookieRequest(
          jwt.sign({ userId: VALID_USER_ID }, process.env.JWT_SECRET as string, {
            expiresIn: "-1s",
          }),
        ),
    ],
    ["a token whose userId is not a valid ObjectId", () => cookieRequest(signSessionToken("invalid"))],
  ])("%s -> 401, no account lookup and no deletion", async (_label, build) => {
    const res = await DELETE(build());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toMatchObject({
      status: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(User.exists).not.toHaveBeenCalled();
    expect(User.findOneAndDelete).not.toHaveBeenCalled();
    expect(clearSessionCookie).not.toHaveBeenCalled();
  });

  it.each([
    ["no Origin header", undefined],
    ["a foreign Origin", "https://attacker.example"],
  ])("cookie-authenticated with %s -> 403, no account lookup and no deletion", async (_label, origin) => {
    const res = await DELETE(
      deleteAccountRequest({ cookieToken: signSessionToken(), origin }),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(User.exists).not.toHaveBeenCalled();
    expect(User.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("valid token but the account no longer exists (e.g. deleted on another device) -> 404 and clears the cookie", async () => {
    vi.mocked(User.findOneAndDelete).mockResolvedValue(null);

    const res = await DELETE(cookieRequest());
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({
      status: false,
      error: { code: "NOT_FOUND" },
    });
    expect(User.findOneAndDelete).toHaveBeenCalledWith(
      { _id: VALID_USER_ID },
      { session: undefined },
    );
    expect(clearSessionCookie).toHaveBeenCalled();
  });

  it("database failure during delete -> 500 INTERNAL_ERROR, not an unhandled exception, cookie left alone", async () => {
    vi.mocked(User.findOneAndDelete).mockRejectedValue(
      new Error("connection lost"),
    );

    const res = await DELETE(cookieRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(clearSessionCookie).not.toHaveBeenCalled();
  });
});