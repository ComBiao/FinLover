import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import User from "@/models/User";
import { registerSchema, type PublicUser } from "@/types/auth";

type ErrorCode =
  | "INVALID_JSON"
  | "CONSENT_REQUIRED"
  | "VALIDATION_ERROR"
  | "EMAIL_ALREADY_EXISTS"
  | "INTERNAL_ERROR";

function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  fields?: Record<string, string>
) {
  return NextResponse.json(
    { error: fields ? { code, message, fields } : { code, message } },
    { status }
  );
}

/** Mongo signals a unique-index violation with code 11000. */
function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === 11000
  );
}

/**
 * POST /api/auth/register
 *
 * Never log the request body — it carries the plaintext password.
 */
export async function POST(req: Request) {
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
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "root";
      fields[key] ??= issue.message;
    }

    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "One or more fields are invalid",
      fields
    );
  }

  const { email, password } = parsed.data;

  try {
    await connectDB();

    const user = await User.create({
      email,
      passwordHash: await hashPassword(password),
      dataPrivacyConsent: true,
    });

    // Built field by field so `passwordHash` can never leak into the response.
    const publicUser: PublicUser = {
      id: String(user._id),
      email: user.email,
      dataPrivacyConsent: user.dataPrivacyConsent,
      createdAt: user.createdAt.toISOString(),
    };

    return NextResponse.json({ user: publicUser }, { status: 201 });
  } catch (err) {
    // The unique index is the single source of truth for email uniqueness —
    // a read-then-write pre-check would still race with a concurrent signup.
    if (isDuplicateKeyError(err)) {
      return errorResponse(
        409,
        "EMAIL_ALREADY_EXISTS",
        "An account with this email already exists",
        { email: "An account with this email already exists" }
      );
    }

    if (err instanceof mongoose.Error.ValidationError) {
      const fields: Record<string, string> = {};
      for (const [key, issue] of Object.entries(err.errors)) {
        fields[key] = issue.message;
      }

      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "One or more fields are invalid",
        fields
      );
    }

    console.error("POST /api/auth/register failed:", err);
    return errorResponse(500, "INTERNAL_ERROR", "Failed to create account");
  }
}
