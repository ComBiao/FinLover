import type { Request, Response, CookieOptions } from "express";
import jwt from "jsonwebtoken";
import { verifyToken } from "./auth";

export const SESSION_COOKIE_NAME = "session_token";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Reuse this fuction instead of hardcoding the options, reduce mismatch risks.
function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Secure only on production
    sameSite: "lax",
    path: "/",
  };
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: SEVEN_DAYS_MS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions());
}

export type SessionVerificationResult<T> =
  | { valid: true; payload: T }
  | { valid: false; reason: "missing" | "expired" | "invalid" };


export function verifySessionToken<T>(
  token: string | undefined | null
): SessionVerificationResult<T> {
  if (!token) {
    return { valid: false, reason: "missing" };
  }

  try {
    const payload = verifyToken<T>(token);
    return { valid: true, payload };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return { valid: false, reason: "expired" };
    }
    return { valid: false, reason: "invalid" };
  }
}

export function getSessionUser<T>(req: Request): T | null {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  const result = verifySessionToken<T>(token);
  return result.valid ? result.payload : null;
}