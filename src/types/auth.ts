import { z } from "zod";

export const registerFieldsSchema = z.object({
  name: z.string().trim().min(2, "Full name must be at least 2 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .refine((v) => new TextEncoder().encode(v).length <= 72, "Password must be at most 72 bytes")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[a-z]/, "Include at least one lowercase letter")
    .regex(/[0-9]/, "Include at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  dataPrivacyConsent: z.literal(true, {
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

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .refine((v) => new TextEncoder().encode(v).length <= 72, "Password must be at most 72 bytes"),
});

export type LoginInput = z.infer<typeof loginSchema>;
