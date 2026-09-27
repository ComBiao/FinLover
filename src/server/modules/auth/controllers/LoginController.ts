import type { LoginService } from "../services/LoginService";
import { NextResponse } from "next/server";
import { loginSchema } from "@/shared/contracts";
import { signToken } from "@/server/shared/auth/crypto";
import { setSessionCookie } from "@/server/shared/auth/session";
import { connectDB } from "@/server/db/index";


type ErrorCode =
  | "INVALID_JSON"
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
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

/**
 * POST /api/auth/login
 *
 * Never log the request body — it carries the plaintext password.
 */
export class LoginController {
  constructor(private service: LoginService) {}
  async handle(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Genuinely malformed JSON (not just failing our schema) — #15 AC4.
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON");
  }

  const parsed = loginSchema.safeParse(body);
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

    const user = await this.service.execute(email, password);

    if (!user) {
      // Identical status + code + message whether the email doesn't exist
      // or the password is wrong — #13 AC2/AC3, prevents user enumeration.
      return errorResponse(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const token = signToken({ userId: user._id.toString(), email: user.email });
    await setSessionCookie(token);

    // Minimal, safe payload — never passwordHash (#13 AC1). Nested under
    // `user` to match register's response shape.
    return NextResponse.json({
      user: { id: user._id.toString(), email: user.email },
    });
  } catch {
    console.error("POST /api/auth/login failed:");
    return errorResponse(500, "INTERNAL_ERROR", "Failed to log in");
  }
}
}
