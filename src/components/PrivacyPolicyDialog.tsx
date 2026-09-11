"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Privacy policy content, shown in a dialog so it's reachable from the
 * register form before the user checks the consent box (#65).
 */
export function PrivacyPolicyDialog() {
  return (
    <Dialog>
      <DialogTrigger className="whitespace-nowrap font-semibold text-accent hover:underline">
        Privacy Policy
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Privacy Policy</DialogTitle>
          <DialogDescription>
            How Finlover collects, uses, and protects your data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1 text-sm text-foreground/85">
          <section>
            <h3 className="mb-1 font-semibold text-foreground">What we collect</h3>
            <p>
              Your email and password, and the financial data you choose to enter —
              transactions, categories, and wallets. Your password is never stored in
              plain text; it&apos;s hashed with bcrypt before it touches our database.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-foreground">How we use it</h3>
            <p>
              Solely to power the app for you: tracking spending, building your reports,
              and showing your balances. We don&apos;t sell your data or use it for
              advertising, ours or anyone else&apos;s.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-foreground">How we protect it</h3>
            <p>
              Passwords are hashed with bcrypt, sessions are kept in httpOnly cookies,
              and an account is only ever created after you&apos;ve given explicit
              consent — never assumed from an empty or skipped checkbox.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-foreground">Your rights</h3>
            <p>
              You can delete your account at any time. Doing so immediately and
              permanently removes everything tied to it — your transactions,
              categories, and wallets included.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold text-foreground">Contact</h3>
            <p>
              Questions about your data? Reach out through the app&apos;s support
              channel any time.
            </p>
          </section>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
