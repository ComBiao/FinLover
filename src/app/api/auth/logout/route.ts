import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

/**
 * POST /api/auth/logout
 *
 * Clears the session cookie (#14 transport). Idempotent — takes no body,
 * checks no session, so calling it while already logged out / expired still
 * succeeds (#16 AC2). Does not touch the DB.
 *
 * Note: with a stateless JWT and no blocklist, this stops the *browser* from
 * authenticating but cannot revoke an already-issued token before its expiry
 * (#16 AC3 limitation — see PR description).
 */
export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
