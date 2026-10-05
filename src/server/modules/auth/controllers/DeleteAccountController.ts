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

  async handle(_request: Request, context: RouteContext) {
    const principal = context.principal;
    if (!principal) {
      // secure({ protected: true }) already guarantees this is non-null
      // before the handler runs; this is defense against future wiring
      // mistakes, not a path expected to actually trigger.
      return errorResponse(401, "UNAUTHORIZED", "Missing or invalid token");
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