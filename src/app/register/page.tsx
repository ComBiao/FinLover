"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, User } from "lucide-react";

import { AuthCard } from "@/components/AuthCard";
import { GoogleButton } from "@/components/GoogleButton";
import { IconInput } from "@/components/IconInput";
import { Logo } from "@/components/Logo";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { registerFieldsSchema, registerSchema } from "@/types/auth";

type FieldName = "name" | "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName | "privacyConsent", string>>;

// Style the pill wrapper only — the nested shadcn Input already paints its own
// aria-invalid border/ring, which would otherwise double up with the wrapper's.
const ERROR_INPUT_CLASS =
  "border-destructive focus-visible:ring-3 focus-visible:ring-destructive/20 [&_[data-slot=input]]:border-0 [&_[data-slot=input]]:shadow-none [&_[data-slot=input]]:ring-0";

/** Validates a single register field; confirmPassword is checked against the live password value. */
function getFieldError(field: FieldName, value: string, password: string): string | undefined {
  if (field === "confirmPassword") {
    const result = registerFieldsSchema.shape.confirmPassword.safeParse(value);
    if (!result.success) return result.error.issues[0]?.message;
    return value === password ? undefined : "Passwords do not match";
  }
  const result = registerFieldsSchema.shape[field].safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}

/**
 * Registration page for creating a new user account with email/password or Google OAuth.
 */
export default function RegisterPage() {
  const [values, setValues] = React.useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [privacyConsent, setPrivacyConsent] = React.useState(false);

  function setFieldError(field: FieldName, error: string | undefined) {
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

  function handleChange(field: FieldName) {
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

  function handleBlur(field: FieldName) {
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

  /**
   * Validates the form with the register zod schema and surfaces per-field
   * error messages instead of submitting.
   * TODO: on successful validation, POST /api/auth/register with
   * { name, email, password, privacyConsent }, using src/lib/auth.ts
   * (hashPassword + signToken) on the server.
   */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = registerSchema.safeParse({
      ...values,
      privacyConsent,
    });

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 sm:px-6">
      <AuthCard
        gradient="b"
        illustration={
          <>
            <Logo />

            <div
              aria-hidden="true"
              className="w-[250px] rounded-2xl bg-card p-5 shadow-lg"
            >
              <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Emergency fund
              </div>
              <div className="mt-0.5 text-xl font-extrabold text-foreground">
                ฿12,400 / ฿20,000
              </div>
              <Progress value={62} className="mt-3" />
            </div>

            <div>
              <p className="text-2xl leading-tight font-extrabold text-foreground">
                Start budgeting
                <br />
                in minutes.
              </p>
              <p className="mt-2.5 max-w-65 text-sm leading-relaxed text-foreground/70">
                Create your free account and see every baht, organized and
                calm.
              </p>
            </div>
          </>
        }
      >
        <div className="text-xs font-bold tracking-wider text-accent uppercase">
          Get started
        </div>
        <h1 className="mt-2 text-3xl font-extrabold text-foreground">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Free forever. No credit card needed.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-name">Full Name</Label>
            <IconInput
              id="register-name"
              name="name"
              type="text"
              icon={User}
              placeholder="Jane Doe"
              autoComplete="name"
              value={values.name}
              onChange={handleChange("name")}
              onBlur={handleBlur("name")}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "register-name-error" : undefined}
              className={cn(errors.name && ERROR_INPUT_CLASS)}
            />
            {errors.name ? (
              <p id="register-name-error" className="text-xs text-destructive">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-email">Email</Label>
            <IconInput
              id="register-email"
              name="email"
              type="email"
              icon={Mail}
              placeholder="you@example.com"
              autoComplete="email"
              value={values.email}
              onChange={handleChange("email")}
              onBlur={handleBlur("email")}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "register-email-error" : undefined}
              className={cn(errors.email && ERROR_INPUT_CLASS)}
            />
            {errors.email ? (
              <p id="register-email-error" className="text-xs text-destructive">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-password">Password</Label>
            <PasswordInput
              id="register-password"
              name="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={values.password}
              onChange={handleChange("password")}
              onBlur={handleBlur("password")}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "register-password-error" : "register-password-hint"
              }
              className={cn(errors.password && ERROR_INPUT_CLASS)}
            />
            {errors.password ? (
              <p id="register-password-error" className="text-xs text-destructive">
                {errors.password}
              </p>
            ) : (
              <p id="register-password-hint" className="text-xs text-muted-foreground">
                At least 8 characters, with uppercase, lowercase, and a number.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-confirm-password">Confirm Password</Label>
            <PasswordInput
              id="register-confirm-password"
              name="confirmPassword"
              placeholder="••••••••"
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={handleChange("confirmPassword")}
              onBlur={handleBlur("confirmPassword")}
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={
                errors.confirmPassword ? "register-confirm-password-error" : undefined
              }
              className={cn(errors.confirmPassword && ERROR_INPUT_CLASS)}
            />
            {errors.confirmPassword ? (
              <p id="register-confirm-password-error" className="text-xs text-destructive">
                {errors.confirmPassword}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="register-privacy-consent"
                name="privacyConsent"
                checked={privacyConsent}
                onCheckedChange={setPrivacyConsent}
                aria-invalid={Boolean(errors.privacyConsent)}
                aria-describedby={
                  errors.privacyConsent ? "register-privacy-consent-error" : undefined
                }
                className="mt-1"
              />
              <Label
                htmlFor="register-privacy-consent"
                className="block text-sm leading-relaxed font-normal text-foreground/85"
              >
                I agree to the{" "}
                <Link
                  href="#"
                  className="whitespace-nowrap font-semibold text-accent hover:underline"
                >
                  Privacy Policy
                </Link>{" "}
                and consent to my data being collected.
              </Label>
            </div>
            {errors.privacyConsent ? (
              <p id="register-privacy-consent-error" className="text-xs text-destructive">
                {errors.privacyConsent}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="mt-2 h-12 rounded-lg text-base">
            Create account
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">
            or continue with
          </span>
          <Separator className="flex-1" />
        </div>

        {/* TODO: wire to a real Google OAuth flow */}
        <GoogleButton />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-bold text-primary hover:underline"
          >
            Log in
          </Link>
        </p>
      </AuthCard>
    </main>
  );
}
