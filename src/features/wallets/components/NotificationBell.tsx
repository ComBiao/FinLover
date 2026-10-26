"use client";

import * as React from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useAcceptInvitation,
  useDeclineInvitation,
  useInvitations,
} from "@/features/wallets/shared/hooks";
import { MemberAvatar } from "@/features/wallets/shared/MemberAvatar";
import type { WalletInvitation } from "@/features/wallets/shared/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Today", "Yesterday", "3 days ago" — invitations never expire, so the age is all that matters. */
function invitationAge(createdAt: string, now = Date.now()) {
  const days = Math.floor((now - new Date(createdAt).getTime()) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

/** Accept / Decline buttons for one invitation, shared by the bell list and the Wallets page banner. */
export function InvitationActions({ invitation }: { invitation: WalletInvitation }) {
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();
  const busy = accept.isPending || decline.isPending;

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        disabled={busy}
        onClick={() => accept.mutate({ invitationId: invitation.id, walletName: invitation.walletName })}
        aria-label={`Accept invitation to ${invitation.walletName}`}
      >
        Accept
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => decline.mutate({ invitationId: invitation.id })}
        aria-label={`Decline invitation to ${invitation.walletName}`}
      >
        Decline
      </Button>
    </div>
  );
}

/**
 * Bell for the page header: a badge with the number of pending wallet
 * invitations and a popover listing them with Accept / Decline.
 */
export function NotificationBell() {
  const { data: invitations = [] } = useInvitations();
  const [open, setOpen] = React.useState(false);
  const count = invitations.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="relative size-11 rounded-full"
            aria-label={
              count > 0
                ? `Notifications, ${count} pending ${count === 1 ? "invitation" : "invitations"}`
                : "Notifications"
            }
          />
        }
      >
        <Bell className="size-5" />
        {count > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white"
          >
            {count}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-2rem))] gap-0 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-bold text-foreground">Invitations</span>
          {count > 0 ? (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-foreground">
              {count} pending
            </span>
          ) : null}
        </div>

        {count === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No pending invitations.</p>
        ) : (
          <ul className="divide-y divide-border">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex flex-col gap-3 px-4 py-3.5">
                <div className="flex gap-3">
                  <MemberAvatar id={invitation.invitedByName} name={invitation.invitedByName} />
                  <div className="flex flex-col gap-0.5 text-sm leading-snug">
                    <span className="text-foreground">
                      <strong>{invitation.invitedByName}</strong> invited you to join{" "}
                      <strong>{invitation.walletName}</strong> as a Contributor
                    </span>
                    <span className="text-xs text-muted-foreground">{invitationAge(invitation.createdAt)}</span>
                  </div>
                </div>
                <div className="pl-12">
                  <InvitationActions invitation={invitation} />
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          Invitations don&apos;t expire. Declining removes it quietly; the Owner isn&apos;t notified.
        </p>
      </PopoverContent>
    </Popover>
  );
}
