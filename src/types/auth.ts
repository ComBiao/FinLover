import { z } from "zod";

export const registerFieldsSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[a-z]/, "Include at least one lowercase letter")
    .regex(/[0-9]/, "Include at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  // A boolean + .refine() (rather than z.literal(true)) so an unchecked box
  // reports as a normal "dirty" issue instead of an abort-level one — a
  // literal mismatch here would short-circuit registerSchema's password-match
  // .refine() below, silently dropping the confirmPassword mismatch error.
  privacyConsent: z.boolean().refine((value) => value === true, {
    error: "You must agree to the privacy policy to continue",
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
