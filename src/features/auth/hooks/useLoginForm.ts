"use client";

import * as React from "react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { postApi, ApiClientError } from '@/lib/api/client';
import type { LoginInput } from '@/shared/contracts';

import { loginSchema } from "@/types/auth";

export type LoginFieldName = "email" | "password";
export type LoginFieldErrors = Partial<Record<LoginFieldName, string>>;

function getFieldError(field: LoginFieldName, value: string): string | undefined {
  const result = loginSchema.shape[field].safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}

/** Validates and submits the browser login using its HttpOnly session cookie. */
export function useLoginForm() {
  const [errors, setErrors] = React.useState<LoginFieldErrors>({});
  const router = useRouter();
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: (input: LoginInput) => postApi('/api/v1/auth/login', input) });
  const isSubmitting = mutation.isPending;
  const [submitNotice, setSubmitNotice] = React.useState<string | null>(null);

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

      const firstInvalidField = result.error.issues[0]?.path[0];
      const firstInvalidInput = event.currentTarget.elements.namedItem(
        String(firstInvalidField)
      );
      if (firstInvalidInput instanceof HTMLElement) {
        firstInvalidInput.focus();
      }
      return;
    }

    setErrors({});
    setSubmitNotice(null);
    try {
      await mutation.mutateAsync(result.data);
      client.clear();
      router.replace('/dashboard');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.fields ?? {});
        setSubmitNotice(error.message);
      } else setSubmitNotice('Unable to connect. Please try again.');
    }
  }

  return {
    errors,
    isSubmitting,
    submitNotice,
    handleFieldChange,
    handleSubmit,
  };
}
