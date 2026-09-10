"use client";

import * as React from "react";

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

/**
 * Encapsulates the registration form's state, field-level validation, and
 * submit flow so the register page can stay limited to rendering.
 * TODO: on successful validation, POST /api/auth/register with
 * { name, email, password, dataPrivacyConsent }, using src/lib/auth.ts
 * (hashPassword + signToken) on the server.
 */
export function useRegisterForm() {
  const [values, setValues] = React.useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = React.useState<RegisterFieldErrors>({});
  const [dataPrivacyConsent, setDataPrivacyConsent] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
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

    const { fieldErrors, firstInvalidField } = validateAll();
    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      // Invalid: every offending field is now highlighted above. Don't submit.
      if (firstInvalidField) {
        const firstInvalidInput = event.currentTarget.elements.namedItem(firstInvalidField);
        if (firstInvalidInput instanceof HTMLElement) {
          firstInvalidInput.focus();
        }
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitNotice(null);

    // TODO: replace this simulated delay with a real POST /api/auth/register
    // call ({ name, email, password, dataPrivacyConsent }) once the endpoint exists.
    await new Promise((resolve) => setTimeout(resolve, 600));

    setIsSubmitting(false);

    // The register API doesn't exist yet, so stay on the page and confirm the
    // client-side check passed instead of faking a real signup.
    setSubmitNotice("Client-side validation passed. Backend integration is pending.");
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
