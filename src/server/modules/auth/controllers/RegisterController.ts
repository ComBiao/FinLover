import { apiErrorResponse, errorResponse, validationFields } from '@/server/shared/http/errors';
import type { RegisterService } from "../services/RegisterService";
import { NextResponse } from "next/server";
import { connectDB } from "@/server/db/index";


import { registerSchema, type PublicUser } from "@/shared/contracts";

/**
 * POST /api/auth/register
 *
 * Never log the request body — it carries the plaintext password.
 */
export class RegisterController {
  constructor(private service: RegisterService) {}
  async handle(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON");
  }

  // Data-privacy gate (issue #12): refuse before any DB access, and before the
  // Mongoose validator gets a say. An omitted field fails this the same as an
  // explicit `false`.
  const consent =
    typeof body === "object" && body !== null
      ? (body as { dataPrivacyConsent?: unknown }).dataPrivacyConsent
      : undefined;

  if (consent !== true) {
    return errorResponse(
      400,
      "CONSENT_REQUIRED",
      "Data privacy consent is required to create an account",
      { dataPrivacyConsent: "Data privacy consent is required" }
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const fields = validationFields(parsed.error);
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "One or more fields are invalid",
      fields
    );
  }

  const { email, password, name } = parsed.data;

  try {
    await connectDB();

    const user = await this.service.execute(email, password, name);

    // Built field by field so `passwordHash` can never leak into the response.
    const publicUser: PublicUser = {
      id: String(user._id),
      email: user.email,
      ...(user.name ? { name: user.name } : {}),
      dataPrivacyConsent: user.dataPrivacyConsent,
      createdAt: user.createdAt.toISOString(),
    };

    return NextResponse.json({ user: publicUser }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err, { duplicate: {
      code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists',
      fields: { email: 'An account with this email already exists' },
    } });
  }
}

}
