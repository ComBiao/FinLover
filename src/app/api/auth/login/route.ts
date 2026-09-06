import { NextResponse } from "next/server";
import { loginSchema } from "@/types/auth";
import { comparePassword, signToken } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

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
 * A syntactically valid bcrypt hash for a password nobody will ever enter.
 * Compared against whenever no user is found, so "no such user" and "wrong
 * password" both run a real bcrypt.compare() and take a similar amount of
 * time (#13 AC6) — without this, a missing user would return 401 measurably
 * faster than a wrong password, and that timing gap alone can enumerate
 * which emails are registered.
 */
const DUMMY_HASH = "$2b$10$ZCo1PYlT87WpnNfBTjsIeuYugew6RVOdi88yCj/vNVWFKZbAkyrlS";

/**
 * POST /api/auth/login
 *
 * Never log the request body — it carries the plaintext password.
 */
export async function POST(request: Request) {
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

    // The User schema's `lowercase: true` / `trim: true` only run when a
    // document is *saved* — Mongoose does not apply schema setters to query
    // filters. The case-insensitive match required by #13 AC5 has to be
    // done here explicitly, on the way in.
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    const passwordMatches = await comparePassword(
      password,
      user?.passwordHash ?? DUMMY_HASH
    );

    if (!user || !passwordMatches) {
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
  } catch (err) {
    console.error("POST /api/auth/login failed:", err);
    return errorResponse(500, "INTERNAL_ERROR", "Failed to log in");
  }
}