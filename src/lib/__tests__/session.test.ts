import { describe, it, expect } from "vitest";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { Request } from "express";
import { signToken } from "../auth";
import { getSessionUser, verifySessionToken, SESSION_COOKIE_NAME } from "../session";

// NOTE: JWT_SECRET must be set before this file's imports run (auth.ts
// reads it at module load time), so set it in vitest.config.ts's
// `test.env`, not with beforeAll() here.

type Payload = { userId: string };

// Minimal stand-in for an Express Request — only the `cookies` field
// getSessionUser() actually reads.
function requestWithCookie(token?: string): Request {
  return { cookies: token ? { [SESSION_COOKIE_NAME]: token } : {} } as unknown as Request;
}

function signWithExpiry(payload: object, expiresIn: SignOptions["expiresIn"]) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn });
}

describe("verifySessionToken / getSessionUser", () => {
  it("AC1 — returns the decoded payload for a valid token", () => {
    const token = signToken({ userId: "user-1" });

    expect(verifySessionToken<Payload>(token)).toEqual({
      valid: true,
      payload: expect.objectContaining({ userId: "user-1" }),
    });
    expect(getSessionUser<Payload>(requestWithCookie(token))).toEqual(
      expect.objectContaining({ userId: "user-1" })
    );
  });

  it("AC2 — rejects a token with a tampered signature", () => {
    const token = signToken({ userId: "user-1" });
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");

    expect(verifySessionToken(tampered)).toEqual({ valid: false, reason: "invalid" });
    expect(getSessionUser(requestWithCookie(tampered))).toBeNull();
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
    expect(getSessionUser(requestWithCookie(expiredToken))).toBeNull();
  });

  it("AC4 — treats a missing token as unauthenticated, not an error", () => {
    expect(verifySessionToken(undefined)).toEqual({ valid: false, reason: "missing" });
    expect(() => getSessionUser(requestWithCookie())).not.toThrow();
    expect(getSessionUser(requestWithCookie())).toBeNull();
  });

  it("cookie-equivalent of AC5 — rejects a garbage cookie value without throwing", () => {
    expect(() => getSessionUser(requestWithCookie("not.a.jwt"))).not.toThrow();
    expect(getSessionUser(requestWithCookie("not.a.jwt"))).toBeNull();
  });
});