import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  privacyConsent: z.literal(true, {
    error: "You must agree to the privacy policy to continue",
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
