"use client";

import * as React from "react";
import { Crown, LogOut, Mail, UserMinus, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInviteMember,
  useLeaveWallet,
  useMembers,
  useRemoveMember,
  useTransferOwnership,
} from "@/features/wallets/shared/hooks";
import { MemberAvatar } from "@/features/wallets/shared/MemberAvatar";
import type { WalletMember } from "@/features/wallets/shared/types";
import { ApiClientError } from "@/lib/api/client";
import type { Wallet } from "@/types/wallet";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  destructive?: boolean;
  isPending: boolean;
  error?: string | null;
  onConfirm: () => void;
};

/** One small confirmation used by every risky member action (remove, transfer, leave). */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  destructive,
  isPending,
  error,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {error ? (
          <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type LeaveWalletDialogProps = {
  wallet: Wallet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the user has left (e.g. to close the Members dialog behind this one). */
  onLeft?: () => void;
};

/** "Leave wallet" confirmation: a Contributor can always leave; the Owner gets the server's 409 to transfer first. */
export function LeaveWalletDialog({ wallet, open, onOpenChange, onLeft }: LeaveWalletDialogProps) {
  const leave = useLeaveWallet();
  const [error, setError] = React.useState<string | null>(null);

  async function handleConfirm() {
    if (!wallet) return;
    try {
      await leave.mutateAsync({ walletId: wallet.id, walletName: wallet.name });
      setError(null);
      onOpenChange(false);
      onLeft?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't leave this wallet");
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
      title={`Leave “${wallet?.name ?? ""}”?`}
      description="You lose access right away, whatever the balance. Transactions you logged stay in the wallet."
      confirmLabel="Leave wallet"
      pendingLabel="Leaving…"
      destructive
      isPending={leave.isPending}
      error={error}
      onConfirm={handleConfirm}
    />
  );
}

type MembersDialogProps = {
  wallet: Wallet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Members popup for a shared wallet. The Owner can invite by email, remove
 * members, cancel pending invitations and hand over ownership; a Contributor
 * sees the same list read-only and can leave.
 */
export function MembersDialog({ wallet, open, onOpenChange }: MembersDialogProps) {
  const isOwner = wallet?.role === "owner";
  const { data: members = [], isPending, isError } = useMembers(open ? wallet?.id : undefined);
  const invite = useInviteMember();
  const remove = useRemoveMember();
  const transfer = useTransferOwnership();

  const [email, setEmail] = React.useState("");
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<WalletMember | null>(null);
  const [transferring, setTransferring] = React.useState<WalletMember | null>(null);
  const [leaving, setLeaving] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);

  const accepted = members.filter((member) => member.status === "accepted");
  const pending = members.filter((member) => member.status === "pending");

  function handleOpenChange(next: boolean) {
    if (!next) {
      setEmail("");
      setInviteError(null);
    }
    onOpenChange(next);
  }

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!wallet) return;
    const value = email.trim();
    if (!value) return;
    if (!EMAIL_PATTERN.test(value)) {
      setInviteError("Enter a valid email address");
      return;
    }
    setInviteError(null);
    try {
      await invite.mutateAsync({ walletId: wallet.id, email: value });
      setEmail("");
    } catch (error) {
      setInviteError(
        error instanceof ApiClientError
          ? (error.fields?.email ?? error.message)
          : "Couldn't send the invitation"
      );
    }
  }

  async function handleRemove() {
    if (!wallet || !removing) return;
    try {
      await remove.mutateAsync({
        walletId: wallet.id,
        userId: removing.userId,
        name: removing.status === "pending" ? removing.email : removing.name,
        pending: removing.status === "pending",
      });
      setRemoving(null);
      setConfirmError(null);
    } catch (error) {
      setConfirmError(error instanceof Error ? error.message : "Couldn't remove this member");
    }
  }

  async function handleTransfer() {
    if (!wallet || !transferring) return;
    try {
      await transfer.mutateAsync({ walletId: wallet.id, userId: transferring.userId, name: transferring.name });
      setTransferring(null);
      setConfirmError(null);
    } catch (error) {
      setConfirmError(error instanceof Error ? error.message : "Couldn't transfer ownership");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[calc(100vh-2rem)] gap-5 overflow-y-auto sm:max-w-[452px]">
          <DialogHeader>
            <DialogTitle>Members</DialogTitle>
            <DialogDescription>
              {wallet?.name}
              {isPending || isError
                ? ""
                : ` · ${accepted.length} ${accepted.length === 1 ? "member" : "members"}${
                    isOwner && pending.length > 0 ? `, ${pending.length} pending` : ""
                  }`}
            </DialogDescription>
          </DialogHeader>

          {isOwner ? (
            <form onSubmit={handleInvite} className="flex flex-col gap-2" noValidate>
              <Label htmlFor="members-invite-email">Invite by email</Label>
              <div className="flex gap-2">
                <Input
                  id="members-invite-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setInviteError(null);
                  }}
                  aria-invalid={Boolean(inviteError)}
                  aria-describedby={inviteError ? "members-invite-error" : undefined}
                />
                <Button type="submit" disabled={invite.isPending || !email.trim()}>
                  {invite.isPending ? "Inviting…" : "Invite"}
                </Button>
              </div>
              {inviteError ? (
                <p id="members-invite-error" role="alert" className="text-sm text-destructive">
                  {inviteError}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  New members join as Contributors once they accept.
                </p>
              )}
            </form>
          ) : (
            <p className="rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
              Only the Owner can invite or remove members. You can leave at any time.
            </p>
          )}

          {isPending ? (
            <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading members">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : isError ? (
            <p role="alert" className="text-sm text-destructive">
              Couldn&apos;t load the members. Please try again.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
              {accepted.map((member) => (
                <li key={member.userId} className="flex items-center gap-3 px-3.5 py-3">
                  <MemberAvatar id={member.userId} name={member.name} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {member.name}
                      {member.isYou ? <span className="font-normal text-muted-foreground"> (you)</span> : null}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">{member.email}</span>
                  </div>
                  {member.role === "owner" ? (
                    <Badge variant="secondary" className="gap-1 bg-chart-1/30 text-foreground">
                      <Crown />
                      Owner
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Contributor</Badge>
                  )}
                  {isOwner && member.role !== "owner" ? (
                    <div className="flex items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Make ${member.name} the Owner`}
                        title="Make Owner"
                        onClick={() => {
                          setConfirmError(null);
                          setTransferring(member);
                        }}
                      >
                        <Crown />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        aria-label={`Remove ${member.name}`}
                        title="Remove"
                        onClick={() => {
                          setConfirmError(null);
                          setRemoving(member);
                        }}
                      >
                        <UserMinus />
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {isOwner && pending.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Pending invitations
              </h3>
              <ul className="flex flex-col gap-2">
                {pending.map((member) => (
                  <li
                    key={member.userId}
                    className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-3.5 py-2.5"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                      <Mail className="size-4" aria-hidden />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold text-foreground">{member.email}</span>
                      <span className="text-xs text-muted-foreground">Waiting for a reply</span>
                    </div>
                    <Badge variant="secondary">Pending</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Cancel invitation for ${member.email}`}
                      onClick={() => {
                        setConfirmError(null);
                        setRemoving(member);
                      }}
                    >
                      <X />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <DialogFooter className="items-center sm:justify-between">
            {isOwner ? (
              <p className="max-w-[260px] text-xs text-muted-foreground">
                As Owner you can&apos;t leave until you transfer ownership to a Contributor.
              </p>
            ) : (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setLeaving(true)}
                className="gap-1.5"
              >
                <LogOut />
                Leave wallet
              </Button>
            )}
            <DialogClose render={<Button type="button" variant="outline" />}>Done</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => {
          if (!next) setRemoving(null);
        }}
        title={removing?.status === "pending" ? "Cancel this invitation?" : `Remove ${removing?.name ?? ""}?`}
        description={
          removing?.status === "pending"
            ? `${removing.email} will no longer be able to join “${wallet?.name ?? ""}”.`
            : `${removing?.name ?? "This member"} loses access to “${wallet?.name ?? ""}” right away. Their past transactions stay in the wallet.`
        }
        confirmLabel={removing?.status === "pending" ? "Cancel invitation" : "Remove"}
        pendingLabel="Removing…"
        destructive
        isPending={remove.isPending}
        error={confirmError}
        onConfirm={handleRemove}
      />

      <ConfirmDialog
        open={transferring !== null}
        onOpenChange={(next) => {
          if (!next) setTransferring(null);
        }}
        title={`Make ${transferring?.name ?? ""} the Owner?`}
        description={`${transferring?.name ?? "They"} will be able to invite and remove members and delete the wallet. You become a Contributor.`}
        confirmLabel="Transfer"
        pendingLabel="Transferring…"
        isPending={transfer.isPending}
        error={confirmError}
        onConfirm={handleTransfer}
      />

      <LeaveWalletDialog
        wallet={wallet}
        open={leaving}
        onOpenChange={setLeaving}
        onLeft={() => onOpenChange(false)}
      />
    </>
  );
}
