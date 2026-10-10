"use client";

import * as React from "react";
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { postApi, ApiClientError } from '@/lib/api/client';
import type { RegisterInput } from '@/shared/contracts';

import { registerFieldsSchema, registerFormSchema } from "@/types/auth";

export type RegisterFieldName = "name" | "email" | "password" | "confirmPassword";
export type RegisterFieldErrors = Partial<Record<RegisterFieldName | "dataPrivacyConsent", string>>;

/** Validates a single register field; confirmPassword is checked against the live password value. */
function getFieldError(
  field: RegisterFieldName,
  value: string,
  password: string
): string | undefined {
  if (field === "confirmPassword") {
    const result = registerFieldsSchema.shape.confirmPassword.safeParse(value);
    if (!result.success) return result.error.issues[0]?.message;
    return value === password ? undefined : "Passwords do not match";
  }
  const result = registerFieldsSchema.shape[field].safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}

/** Client-only name/complexity rules stay separate from the persisted API fields. */
export function useRegisterForm() {
  const [values, setValues] = React.useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = React.useState<RegisterFieldErrors>({});
  const [dataPrivacyConsent, setDataPrivacyConsent] = React.useState(false);
  const router = useRouter();
  const mutation = useMutation({ mutationFn: (input: RegisterInput) => postApi('/api/v1/auth/register', input) });
  const isSubmitting = mutation.isPending;
  const submitLock = React.useRef(false);
  const [submitNotice, setSubmitNotice] = React.useState<string | null>(null);

  function setFieldError(field: keyof RegisterFieldErrors, error: string | undefined) {
    setErrors((prev) => {
      if (!error) {
        if (!(field in prev)) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return { ...prev, [field]: error };
    });
  }

  function handleChange(field: RegisterFieldName) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      const nextValues = { ...values, [field]: value };
      setValues(nextValues);

      // Dynamically clear this field's error as soon as it becomes valid.
      if (errors[field]) {
        setFieldError(field, getFieldError(field, value, nextValues.password));
      }
      // Keep confirmPassword in sync if the user edits password afterwards.
      if (field === "password" && errors.confirmPassword && nextValues.confirmPassword) {
        setFieldError(
          "confirmPassword",
          getFieldError("confirmPassword", nextValues.confirmPassword, nextValues.password)
        );
      }
    };
  }

  function handleBlur(field: RegisterFieldName) {
    return (event: React.FocusEvent<HTMLInputElement>) => {
      const value = event.target.value;
      const nextValues = { ...values, [field]: value };
      setFieldError(field, getFieldError(field, value, nextValues.password));
      if (field === "password" && nextValues.confirmPassword) {
        setFieldError(
          "confirmPassword",
          getFieldError("confirmPassword", nextValues.confirmPassword, nextValues.password)
        );
      }
    };
  }

  function handleDataPrivacyConsentChange(checked: boolean) {
    setDataPrivacyConsent(checked);
    if (checked) {
      setFieldError("dataPrivacyConsent", undefined);
    }
  }

  /** Validates every field (name, email, password, confirmPassword, dataPrivacyConsent) at once. */
  function validateAll(): {
    fieldErrors: RegisterFieldErrors;
    firstInvalidField?: keyof RegisterFieldErrors;
  } {
    const result = registerFormSchema.safeParse({
      ...values,
      dataPrivacyConsent,
    });

    if (result.success) return { fieldErrors: {} };

    const fieldErrors: RegisterFieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof RegisterFieldErrors;
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return {
      fieldErrors,
      firstInvalidField: result.error.issues[0]?.path[0] as keyof RegisterFieldErrors,
    };
  }

  /**
   * Validates the whole form and surfaces every field's error at once instead
   * of submitting.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    const form = event.currentTarget;

    const { fieldErrors, firstInvalidField } = validateAll();
    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      // Invalid: every offending field is now highlighted above. Don't submit.
      if (firstInvalidField) {
        const firstInvalidInput = form.elements.namedItem(firstInvalidField);
        if (firstInvalidInput instanceof HTMLElement) {
          firstInvalidInput.focus();
        }
      }
      return;
    }

    setSubmitNotice(null);
    submitLock.current = true;
    try {
      await mutation.mutateAsync({ name: values.name.trim(), email: values.email.trim(), password: values.password, confirmPassword: values.confirmPassword, dataPrivacyConsent: true });
      router.replace('/login?registered=1');
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.fields ?? {});
        setSubmitNotice(error.message);
        const firstField = Object.keys(error.fields ?? {})[0];
        const input = form.elements.namedItem(firstField);
        if (input instanceof HTMLElement) input.focus();
      } else setSubmitNotice('Unable to connect. Please try again.');
    } finally {
      submitLock.current = false;
    }
  }

  return {
    values,
    errors,
    dataPrivacyConsent,
    isSubmitting,
    submitNotice,
    handleChange,
    handleBlur,
    handleDataPrivacyConsentChange,
    handleSubmit,
  };
}
