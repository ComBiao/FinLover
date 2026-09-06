"use client";

import * as React from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

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
import { registerSchema } from "@/types/auth";

type FieldErrors = Partial<Record<"email" | "password" | "privacyConsent", string>>;

/**
 * Registration page for creating a new user account with email/password or Google OAuth.
 */
export default function RegisterPage() {
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [privacyConsent, setPrivacyConsent] = React.useState(false);

  /**
   * Validates the form with the register zod schema and surfaces per-field
   * error messages instead of submitting.
   * TODO: on successful validation, POST /api/auth/register with
   * { email, password, privacyConsent }, using src/lib/auth.ts
   * (hashPassword + signToken) on the server.
   */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const result = registerSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
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
            <Label htmlFor="register-email">Email</Label>
            <IconInput
              id="register-email"
              name="email"
              type="email"
              icon={Mail}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "register-email-error" : undefined}
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
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "register-password-error" : "register-password-hint"
              }
            />
            {errors.password ? (
              <p id="register-password-error" className="text-xs text-destructive">
                {errors.password}
              </p>
            ) : (
              <p id="register-password-hint" className="text-xs text-muted-foreground">
                Use at least 8 characters.
              </p>
            )}
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
