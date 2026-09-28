import { z } from "zod";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_BYTES } from "@/shared/contracts";
export * from "@/shared/contracts";
const utf8ByteLength = (value: string) => new TextEncoder().encode(value).length;
/**
 * Fields the register *form* collects and validates per-field, client-side
 * only. `name` isn't part of `registerSchema` above (the User model doesn't
 * persist it yet) — this is UI validation ahead of that field existing
 * server-side.
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

/** Whole-form submit validation for the register form, including cross-field checks. */
export const registerFormSchema = registerFieldsSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  }
);

export type RegisterFormInput = z.infer<typeof registerFormSchema>;
