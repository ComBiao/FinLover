import Link from "next/link";
import { Mail } from "lucide-react";

import { AuthCard } from "@/components/AuthCard";
import { GoogleButton } from "@/components/GoogleButton";
import { IconInput } from "@/components/IconInput";
import { Logo } from "@/components/Logo";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

/**
 * Login page with email/password form and Google OAuth option.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 sm:px-6">
      <AuthCard
        gradient="a"
        illustration={
          <>
            <Logo />

            <div aria-hidden="true" className="relative self-start">
              <div className="w-[250px] rounded-2xl bg-card p-5 shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="h-6 w-[34px] rounded-md bg-chart-1" />
                  <div className="flex">
                    <span className="-mr-1.5 size-4 rounded-full bg-chart-3" />
                    <span className="size-4 rounded-full bg-chart-2" />
                  </div>
                </div>
                <div className="mt-4 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Total balance
                </div>
                <div className="mt-0.5 text-2xl font-extrabold text-foreground">
                  ฿48,290.00
                </div>
              </div>
              <div className="absolute -right-6 top-[calc(100%-18px)] w-[150px] rounded-xl bg-card p-4 shadow-lg">
                <div className="text-[11.5px] text-muted-foreground">
                  Savings goal
                </div>
                <div className="my-1 text-sm font-bold text-success">
                  +12.4%
                </div>
                <svg width="118" height="30" viewBox="0 0 118 30">
                  <polyline
                    points="0,24 20,20 40,22 58,12 78,15 98,5 118,8"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div>
              <p className="text-2xl leading-tight font-extrabold text-foreground">
                Your money,
                <br />
                made lovable.
              </p>
              <p className="mt-2.5 max-w-65 text-sm leading-relaxed text-foreground/70">
                Track spending, grow savings, and hit your goals — all in one
                calm, pastel-colored place.
              </p>
            </div>
          </>
        }
      >
        <div className="text-xs font-bold tracking-wider text-accent uppercase">
          Welcome back
        </div>
        <h1 className="mt-2 text-3xl font-extrabold text-foreground">
          Log in to Finlover
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Pick up right where you left off with your budget.
        </p>

        {/* TODO: wire to a real submit handler — POST /api/auth/login, using
            src/lib/auth.ts (comparePassword + signToken) on the server. */}
        <form className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-email">Email</Label>
            <IconInput
              id="login-email"
              name="email"
              type="email"
              icon={Mail}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="login-password">Password</Label>
              <Link
                href="#"
                className="text-sm font-semibold text-accent hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <Button type="submit" className="mt-2 h-12 rounded-lg text-base">
            Log in
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
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-bold text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
      </AuthCard>
    </main>
  );
}
