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
 * Request body accepted by `POST /api/auth/register`.
 *
 * `dataPrivacyConsent` is a `literal(true)` rather than a boolean: a missing
 * field and an explicit `false` must both be rejected, never read as "no
 * opinion". The route additionally gates on consent before any DB access.
 */
export const registerSchema = z
  .object({
    email: z.email({ error: "Email must be a valid email address" }),
    password: z
      .string({ error: "Password is required" })
      .min(PASSWORD_MIN_LENGTH, {
        error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      })
      .refine((value) => utf8ByteLength(value) <= PASSWORD_MAX_BYTES, {
        error: `Password must be at most ${PASSWORD_MAX_BYTES} bytes`,
      }),
    confirmPassword: z.string({ error: "Password confirmation is required" }),
    dataPrivacyConsent: z.literal(true, {
      error: "Data privacy consent is required",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Request body accepted by `POST /api/auth/login`.
 *
 * Deliberately looser than `registerSchema` on password: login only needs to
 * confirm the request is *well-formed* (right shape, right types) — not
 * re-enforce password policy, which was already applied at registration.
 * #15 AC1 requires a merely non-empty password to pass validation, not an
 * 8-character minimum.
 *
 * `.max(254, ...)` on email exists specifically for #15 AC6 — without an
 * explicit bound, a 10,000-character string could still reach the database
 * query before any check rejects it.
 */
export const loginSchema = z.object({
  email: z
    .email({ error: "Email must be a valid email address" })
    .max(254, { error: "Email is too long" }),
  password: z
    .string({ error: "Password is required" })
    .min(1, { error: "Password is required" }),
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