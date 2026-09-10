import { z } from "zod";

/** Minimum password length accepted at registration. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * bcrypt hashes only the first 72 UTF-8 bytes and silently ignores the rest, so
 * two passwords sharing a 72-byte prefix would authenticate interchangeably.
 * Reject anything longer rather than let it be truncated. Counted in bytes, not
 * characters — one emoji is four of these.
 */
export const PASSWORD_MAX_BYTES = 72;

const utf8ByteLength = (value: string) => new TextEncoder().encode(value).length;

/**
 * Request body accepted by `POST /api/auth/register`, and the shape the
 * register form validates client-side. `name` and `confirmPassword` are
 * UI-only fields — neither is persisted by the User model yet.
 */
export const registerFieldsSchema = z.object({
  name: z.string().trim().min(2, "Full name must be at least 2 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .refine(
      (v) => utf8ByteLength(v) <= PASSWORD_MAX_BYTES,
      `Password must be at most ${PASSWORD_MAX_BYTES} bytes`
    )
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[a-z]/, "Include at least one lowercase letter")
    .regex(/[0-9]/, "Include at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  dataPrivacyConsent: z.boolean().refine((value) => value === true, {
    message: "You must agree to the privacy policy to continue",
  }),
});

export const registerSchema = registerFieldsSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  }
);

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Request body accepted by `POST /api/auth/login`, and what the login form
 * validates client-side.
 *
 * Deliberately looser than `registerFieldsSchema` on password: login only
 * needs to confirm the request is *well-formed* — not re-enforce password
 * policy, which was already applied at registration. #15 AC1 requires a
 * merely non-empty password to pass validation, not an 8-character minimum.
 *
 * `.max(254, ...)` on email exists specifically for #15 AC6 — without an
 * explicit bound, a 10,000-character string could still reach the database
 * query before any check rejects it.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(254, "Email is too long"),
  password: z
    .string()
    .min(1, "Password is required")
    .refine(
      (v) => utf8ByteLength(v) <= PASSWORD_MAX_BYTES,
      `Password must be at most ${PASSWORD_MAX_BYTES} bytes`
    ),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Public shape of a user — never carries `passwordHash`. */
export type PublicUser = {
  id: string;
  email: string;
  dataPrivacyConsent: boolean;
  /**
   * Doubles as the data-privacy consent timestamp: a `User` document cannot be
   * created without consent, so creation time *is* consent time (issue #12).
   */
  createdAt: string;
};
