import Link from "next/link";
import { Mail } from "lucide-react";

import { AuthCard } from "@/components/AuthCard";
import { GoogleButton } from "@/components/GoogleButton";
import { IconInput } from "@/components/IconInput";
import { Logo } from "@/components/Logo";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

/**
 * Registration page for creating a new user account with email/password or Google OAuth.
 */
export default function RegisterPage() {
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

        {/* TODO: wire to a real submit handler — POST /api/auth/register,
            using src/lib/auth.ts (hashPassword + signToken) on the server. */}
        <form className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-email">Email</Label>
            <IconInput
              id="register-email"
              name="email"
              type="email"
              icon={Mail}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-password">Password</Label>
            <PasswordInput
              id="register-password"
              name="password"
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">
              Use at least 8 characters.
            </p>
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
