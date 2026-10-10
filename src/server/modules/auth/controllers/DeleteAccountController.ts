import { NextResponse } from "next/server";
import { apiErrorResponse, errorResponse } from "@/server/shared/http/errors";
import { AppError } from "@/server/shared/kernel/AppError";
import type { DeleteAccountService } from "../services/DeleteAccountService";
import type { RouteContext } from "@/server/shared/http/policy";
import { clearSessionCookie } from "@/server/shared/auth/session";
import { connectDB } from "@/server/db/index";

/**
 * DELETE /api/auth/delete-account
 *
 * No re-authentication (password) is required to call this -- an explicit
 * team decision, not an oversight. The cascade to wallets/categories/
 * transactions happens inside DeleteAccountService via the existing User
 * model hook, not here.
 */
export class DeleteAccountController {
  constructor(private service: DeleteAccountService) {}

  /**
   * Deletes the account identified by the verified principal in context, without
   * password re-entry. Authentication and Origin checks belong to the route policy.
   * Returns 401 for a missing or non-cookie principal, 200 with { success: true }
   * after deletion, or 404 if the account is already missing when deletion is attempted.
   * Clears the cookie on 200/404.
   * Other caught errors become API error responses; unexpected errors become 500.
   * Connection or deletion failures other than NOT_FOUND leave the cookie alone.
   *
   * @throws Errors clearing the cookie in the NOT_FOUND handler propagate.
   */
  async handle(_request: Request, context: RouteContext) {
    const principal = context.principal;
    if (!principal) {
      // secure({ protected: true }) already guarantees this is non-null
      // before the handler runs; this is defense against future wiring
      // mistakes, not a path expected to actually trigger.
      return errorResponse(401, "UNAUTHORIZED", "Missing or invalid token");
    }
    if (principal.source !== "cookie") {
      return errorResponse(
        401,
        "UNAUTHORIZED",
        "This endpoint requires a browser session",
      );
    }

    try {
      await connectDB();
      await this.service.execute(principal.userId);
      await clearSessionCookie();
      return NextResponse.json({ success: true });
    } catch (error) {
      // Even a stale/replayed token pointing at an already-deleted account
      // (NOT_FOUND) leaves nothing left for this cookie to authenticate --
      // clear it on that path too, not only on a clean success.
      if (error instanceof AppError && error.code === "NOT_FOUND") {
        await clearSessionCookie();
      }
      return apiErrorResponse(error);
    }
  }
}
