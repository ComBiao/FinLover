import type { NextRequest } from "next/server";
import { v1 } from "@/server/shared/http/versioned-handlers";
export const runtime = "nodejs";
/**
 * Permanently deletes the account and related data for a valid session cookie
 * from a trusted Origin; Authorization headers are rejected. No body is required.
 * Returns the v1 response envelope and clears the cookie on success or a missing account.
 */
export const DELETE = (request: NextRequest) => v1.deleteAccount(request, { params: Promise.resolve({ id: "" }) });