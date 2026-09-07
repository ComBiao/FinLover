import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(1, "Full name is required"),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    privacyConsent: z.literal(true, {
      error: "You must agree to the privacy policy to continue",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
