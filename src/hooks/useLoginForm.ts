"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { loginSchema } from "@/types/auth";

export type LoginFieldName = "email" | "password";
export type LoginFieldErrors = Partial<Record<LoginFieldName, string>>;

function getFieldError(field: LoginFieldName, value: string): string | undefined {
  const result = loginSchema.shape[field].safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}

/**
 * Encapsulates the login form's validation and submit flow so the login page
 * can stay limited to rendering.
 * TODO: on successful validation, POST /api/auth/login with
 * { email, password }, using src/lib/auth.ts (comparePassword + signToken)
 * on the server.
 */
export function useLoginForm() {
  const router = useRouter();
  const [errors, setErrors] = React.useState<LoginFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  /** Clears a field's error as soon as it becomes valid; leaves it untouched otherwise. */
  function handleFieldChange(field: LoginFieldName) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!errors[field]) return;
      if (!getFieldError(field, event.target.value)) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    };
  }

  /**
   * Validates the form with the login zod schema and surfaces per-field
   * error messages instead of submitting.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const result = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!result.success) {
      const fieldErrors: LoginFieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginFieldErrors;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    // TODO: replace this simulated delay with a real POST /api/auth/login
    // call ({ email, password }) once the endpoint exists.
    await new Promise((resolve) => setTimeout(resolve, 600));

    setIsSubmitting(false);
    router.push("/dashboard");
  }

  return {
    errors,
    isSubmitting,
    handleFieldChange,
    handleSubmit,
  };
}
