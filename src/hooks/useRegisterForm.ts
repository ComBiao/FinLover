"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { registerFieldsSchema, registerSchema } from "@/types/auth";

export type RegisterFieldName = "name" | "email" | "password" | "confirmPassword";
export type RegisterFieldErrors = Partial<Record<RegisterFieldName | "privacyConsent", string>>;

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

/**
 * Encapsulates the registration form's state, field-level validation, and
 * submit flow so the register page can stay limited to rendering.
 * TODO: on successful validation, POST /api/auth/register with
 * { name, email, password, privacyConsent }, using src/lib/auth.ts
 * (hashPassword + signToken) on the server.
 */
export function useRegisterForm() {
  const router = useRouter();
  const [values, setValues] = React.useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = React.useState<RegisterFieldErrors>({});
  const [privacyConsent, setPrivacyConsent] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  function handlePrivacyConsentChange(checked: boolean) {
    setPrivacyConsent(checked);
    if (checked) {
      setFieldError("privacyConsent", undefined);
    }
  }

  /** Validates every field (name, email, password, confirmPassword, privacyConsent) at once. */
  function validateAll(): RegisterFieldErrors {
    const result = registerSchema.safeParse({
      ...values,
      privacyConsent,
    });

    if (result.success) return {};

    const fieldErrors: RegisterFieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof RegisterFieldErrors;
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return fieldErrors;
  }

  /**
   * Validates the whole form and surfaces every field's error at once instead
   * of submitting.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const fieldErrors = validateAll();
    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      // Invalid: every offending field is now highlighted above. Don't submit.
      return;
    }

    setIsSubmitting(true);

    // TODO: replace this simulated delay with a real POST /api/auth/register
    // call ({ name, email, password, privacyConsent }) once the endpoint exists.
    await new Promise((resolve) => setTimeout(resolve, 600));

    setIsSubmitting(false);
    router.push("/login");
  }

  return {
    values,
    errors,
    privacyConsent,
    isSubmitting,
    handleChange,
    handleBlur,
    handlePrivacyConsentChange,
    handleSubmit,
  };
}
