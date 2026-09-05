import { describe, it, expect, vi } from "vitest";
import jwt, { type SignOptions } from "jsonwebtoken";
import { signToken } from "../auth";
import { getSessionUser, verifySessionToken, SESSION_COOKIE_NAME } from "../session";

// server-only throws by design unless Next.js's own bundler sets an
// internal flag marking the code as genuinely server-side. Vitest never
// sets that flag, so every import of server-only would otherwise throw
// here — this neutralizes it for the test run only.
vi.mock("server-only", () => ({}));

// next/headers' cookies() only works inside a live Next.js request
// context (it reads from AsyncLocalStorage under the hood), so outside
// of an actual request it throws rather than returning undefined. We
// mock it here to control what "the incoming cookie" is per test.
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";

function mockIncomingCookie(token?: string) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) =>
      name === SESSION_COOKIE_NAME && token !== undefined
        ? { name, value: token }
        : undefined,
  } as Awaited<ReturnType<typeof cookies>>);
}

function signWithExpiry(payload: object, expiresIn: SignOptions["expiresIn"]) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn });
}

type Payload = { userId: string };

// verifySessionToken is a pure function — no mocking needed, same tests
// as the Express version, since this half never touched the framework.
describe("verifySessionToken", () => {
  it("AC1 — returns the decoded payload for a valid token", () => {
    const token = signToken({ userId: "user-1" });

    expect(verifySessionToken<Payload>(token)).toEqual({
      valid: true,
      payload: expect.objectContaining({ userId: "user-1" }),
    });
  });

  it("AC2 — rejects a token with a tampered signature", () => {
    const token = signToken({ userId: "user-1" });
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");

    expect(verifySessionToken(tampered)).toEqual({ valid: false, reason: "invalid" });
  });

  it("AC2 — rejects a token signed with the wrong secret", () => {
    const wrongSecretToken = jwt.sign({ userId: "user-1" }, "not-the-real-secret", {
      expiresIn: "7d",
    });

    expect(verifySessionToken(wrongSecretToken)).toEqual({ valid: false, reason: "invalid" });
  });

  it("AC3 — distinguishes an expired token from a malformed one", () => {
    const expiredToken = signWithExpiry({ userId: "user-1" }, "-1s");

    expect(verifySessionToken(expiredToken)).toEqual({ valid: false, reason: "expired" });
  });

  it("AC4 — treats a missing token as unauthenticated, not an error", () => {
    expect(verifySessionToken(undefined)).toEqual({ valid: false, reason: "missing" });
  });

  it("classifies an empty string as invalid, not missing", () => {
    expect(verifySessionToken("")).toEqual({ valid: false, reason: "invalid" });
  });
});

// getSessionUser reads from next/headers, so these tests drive it
// through the mocked cookie store instead of a real request.
describe("getSessionUser", () => {
  it("AC1 — returns the decoded payload for a valid token", async () => {
    const token = signToken({ userId: "user-1" });
    mockIncomingCookie(token);

    const user = await getSessionUser<Payload>();
    expect(user).toEqual(expect.objectContaining({ userId: "user-1" }));
  });

  it("AC2 — returns null for a tampered token", async () => {
    const token = signToken({ userId: "user-1" });
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    mockIncomingCookie(tampered);

    expect(await getSessionUser()).toBeNull();
  });

  it("AC3 — returns null for an expired token", async () => {
    const expiredToken = signWithExpiry({ userId: "user-1" }, "-1s");
    mockIncomingCookie(expiredToken);

    expect(await getSessionUser()).toBeNull();
  });

  it("AC4 — treats no cookie present as unauthenticated, not an error", async () => {
    mockIncomingCookie(undefined);

    await expect(getSessionUser()).resolves.toBeNull();
  });

  it("cookie-equivalent of AC5 — rejects a garbage cookie value without throwing", async () => {
    mockIncomingCookie("not.a.jwt");

    await expect(getSessionUser()).resolves.toBeNull();
  });
});