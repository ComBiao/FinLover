import "server-only";
import { cookies } from "next/headers";
import jwt, { type SignOptions } from "jsonwebtoken";
import { verifyToken } from "./auth";

export const SESSION_COOKIE_NAME = "session_token";

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

function cookieOptions() {
  return {
    httpOnly: true,
    // "Secure" requires HTTPS. Most browsers won't set it at all over
    // plain http://localhost in dev, so gate it on NODE_ENV rather than
    // hardcoding true — otherwise local dev logins silently fail.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

/**
 * Sets the session cookie after a successful login.
 * Callable from a Route Handler or Server Action — Next.js only allows
 * cookie writes in those two contexts, not in Server Components.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: SEVEN_DAYS_SECONDS, // Next.js's maxAge is in seconds, not ms
  });
}

/**
 * Clears the session cookie on logout (#16).
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export type SessionVerificationResult<T> =
  | { valid: true; payload: T }
  | { valid: false; reason: "missing" | "expired" | "invalid" };

/**
 * Pure verification, decoupled from the transport. Exposes *why*
 * verification failed (missing / expired / invalid), which
 * getSessionUser() below intentionally collapses to null for callers
 * that just need a yes/no answer. Unchanged from the Express version —
 * this part never depended on the framework.
 */
export function verifySessionToken<T>(
  token: string | undefined | null
): SessionVerificationResult<T> {
  if (token === undefined || token === null) {
    return { valid: false, reason: "missing" };
  }

  try {
    const payload = verifyToken<T>(token);
    return { valid: true, payload };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return { valid: false, reason: "expired" };
    }
    // Covers JsonWebTokenError (bad signature, tampered payload,
    // malformed string, wrong secret) and NotBeforeError.
    return { valid: false, reason: "invalid" };
  }
}

/**
 * The function the rest of the app should call — from Server
 * Components, Route Handlers, or Server Actions alike. Reads the
 * session cookie via next/headers and returns the decoded payload, or
 * null if the request is unauthenticated for any reason. Never throws.
 */
export async function getSessionUser<T>(): Promise<T | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const result = verifySessionToken<T>(token);
  return result.valid ? result.payload : null;
}