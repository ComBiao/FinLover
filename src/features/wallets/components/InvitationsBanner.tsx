"use client";

import { Mail } from "lucide-react";

import { InvitationActions } from "@/features/wallets/components/NotificationBell";
import { useInvitations } from "@/features/wallets/shared/hooks";

/**
 * Banner at the top of the Wallets page for the newest pending invitation.
 * Any others wait in the notification bell. Renders nothing without invitations.
 */
export function InvitationsBanner() {
  const { data: invitations = [] } = useInvitations();
  const [latest, ...others] = invitations;
  if (!latest) return null;

  return (
    <section
      aria-label="Wallet invitation"
      className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-accent/30 bg-accent/10 px-[18px] py-3.5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Mail className="size-[18px]" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-semibold text-foreground">
          {latest.invitedByName} invited you to join &ldquo;{latest.walletName}&rdquo; as a Contributor
        </p>
        {others.length > 0 ? (
          <p className="text-xs font-medium text-muted-foreground">
            {others.length} more {others.length === 1 ? "invitation" : "invitations"} waiting in notifications
          </p>
        ) : null}
      </div>
      <InvitationActions invitation={latest} />
    </section>
  );
}
