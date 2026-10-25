"use client";

import * as React from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hexToRgba } from "@/components/chipColor";
import { useCreateWallet } from "@/features/wallets/hooks/useWallets";
import { SwitchField } from "@/features/wallets/shared/SwitchField";
import { WALLET_ICON_OPTIONS } from "@/features/wallets/walletIcons";
import { validateInviteEmail } from "@/features/wallets/shared/membersService";
import { ApiClientError } from "@/lib/api/client";

const PRESET_COLORS = [
  "#4A4757",
  "#E3B15C",
  "#4E9466",
  "#8B7CF6",
  "#E85C7D",
  "#3B82F6",
  "#10B981",
  "#EC4899",
  "#F59E0B",
  "#6366F1",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CreateWalletDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Starts with the shared-wallet switch on (the Wallets page passes it while its Shared tab is showing). */
  defaultShared?: boolean;
};

export function CreateWalletDialog({ open, onOpenChange, defaultShared = false }: CreateWalletDialogProps) {
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState(PRESET_COLORS[0]);
  const [icon, setIcon] = React.useState("Wallet");
  const [isSaving, setIsSaving] = React.useState(false);
  const [goalAmount, setGoalAmount] = React.useState("");
  const [isShared, setIsShared] = React.useState(defaultShared);
  const [inviteInput, setInviteInput] = React.useState("");
  const [inviteEmails, setInviteEmails] = React.useState<string[]>([]);
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const createWalletMutation = useCreateWallet();

  function resetForm() {
    setName("");
    setColor(PRESET_COLORS[0]);
    setIcon("Wallet");
    setIsSaving(false);
    setGoalAmount("");
    setIsShared(defaultShared);
    setInviteInput("");
    setInviteEmails([]);
    setInviteError(null);
    setIsCheckingEmail(false);
    setError(null);
  }

  /** Adds the typed email as a chip; returns false (and shows why) when it can't be added. */
  async function addInviteEmail(): Promise<boolean> {
    const email = inviteInput.trim().toLowerCase();
    if (!email) return true;
    if (!EMAIL_PATTERN.test(email)) {
      setInviteError("Enter a valid email address");
      return false;
    }
    if (inviteEmails.includes(email)) {
      setInviteInput("");
      setInviteError(null);
      return true;
    }

    setIsCheckingEmail(true);
    setInviteError(null);
    try {
      await validateInviteEmail(email);
      setInviteEmails((current) => (current.includes(email) ? current : [...current, email]));
      setInviteInput("");
      setInviteError(null);
      return true;
    } catch (err) {
      setInviteError(
        err instanceof ApiClientError
          ? (err.fields?.email ?? err.message)
          : err instanceof Error
            ? err.message
            : "User not found"
      );
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Wallet name is required");
      return;
    }

    if (trimmedName.length > 50) {
      setError("Wallet name must be 50 characters or fewer");
      return;
    }

    let parsedGoal: number | undefined;
    if (isSaving) {
      const num = Number(goalAmount);
      if (Number.isNaN(num) || num <= 0) {
        setError("Goal amount must be greater than 0");
        return;
      }
      parsedGoal = num;
    }

    // An email typed but not yet added still counts.
    const pendingEmail = inviteInput.trim().toLowerCase();
    let emails = inviteEmails;
    if (isShared && pendingEmail) {
      const added = await addInviteEmail();
      if (!added) return;
      emails = inviteEmails.includes(pendingEmail) ? inviteEmails : [...inviteEmails, pendingEmail];
    }

    setError(null);

    try {
      await createWalletMutation.mutateAsync({
        name: trimmedName,
        color,
        icon,
        isSaving,
        goalAmount: parsedGoal,
        ...(isShared ? { isShared: true, inviteEmails: emails } : {}),
      });
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create wallet");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetForm();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[425px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Create Wallet</DialogTitle>
          </DialogHeader>

          {error ? (
            <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="create-wallet-name">Wallet Name</Label>
            <Input
              id="create-wallet-name"
              placeholder="e.g. Daily Expenses, Vacation Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Wallet Color</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  className="flex size-7 items-center justify-center rounded-full border border-border transition-transform hover:scale-110"
                  style={{ backgroundColor: preset }}
                  aria-label={`Select color ${preset}`}
                >
                  {color === preset ? <Check className="size-4 text-white" /> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Wallet Icon</Label>
            <div className="grid grid-cols-6 gap-2 pt-1 sm:grid-cols-7">
              {WALLET_ICON_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = icon === opt.name;
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setIcon(opt.name)}
                    className="flex size-9 items-center justify-center rounded-xl border transition-all hover:scale-105"
                    style={{
                      borderColor: isSelected ? color : "var(--border)",
                      backgroundColor: isSelected ? hexToRgba(color, 0.15) : "transparent",
                      color: isSelected ? color : "var(--muted-foreground)",
                    }}
                    aria-label={`Select ${opt.label} icon`}
                    title={opt.label}
                  >
                    <IconComponent className="size-4.5" />
                  </button>
                );
              })}
            </div>
          </div>

          <SwitchField
            id="create-wallet-is-saving"
            label="This is a saving wallet with a goal"
            checked={isSaving}
            onCheckedChange={setIsSaving}
          />

          {isSaving ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="create-wallet-goal">Saving Goal (฿)</Label>
              <Input
                id="create-wallet-goal"
                type="number"
                min="0.01"
                step="any"
                placeholder="e.g. 50000"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                required={isSaving}
              />
            </div>
          ) : null}

          <SwitchField
            id="create-wallet-is-shared"
            label="This is a shared wallet with other people"
            checked={isShared}
            onCheckedChange={setIsShared}
          />

          {isShared ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="create-wallet-invite">
                Invite members <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="create-wallet-invite"
                  type="email"
                  placeholder="Enter an email and press Enter"
                  value={inviteInput}
                  disabled={isCheckingEmail}
                  onChange={(e) => {
                    setInviteInput(e.target.value);
                    setInviteError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addInviteEmail();
                    }
                  }}
                  aria-invalid={Boolean(inviteError)}
                  aria-describedby={inviteError ? "create-wallet-invite-error" : undefined}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isCheckingEmail || !inviteInput.trim()}
                  onClick={() => void addInviteEmail()}
                >
                  {isCheckingEmail ? "Checking…" : "Add"}
                </Button>
              </div>
              {inviteError ? (
                <p id="create-wallet-invite-error" role="alert" className="text-sm text-destructive">
                  {inviteError}
                </p>
              ) : null}
              {inviteEmails.length > 0 ? (
                <ul className="flex flex-wrap gap-2" aria-label="Invited emails">
                  {inviteEmails.map((email) => (
                    <li
                      key={email}
                      className="flex items-center gap-1.5 rounded-full bg-accent/15 py-1 pr-1.5 pl-3 text-sm font-medium text-foreground"
                    >
                      {email}
                      <button
                        type="button"
                        aria-label={`Remove ${email}`}
                        onClick={() => setInviteEmails((current) => current.filter((item) => item !== email))}
                        className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Invited people join as Contributors after they accept. The wallet starts at ฿0.00 and you
                are the Owner.
              </p>
            </div>
          ) : null}

          <DialogFooter className="mt-4 gap-2">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={createWalletMutation.isPending}>
              {createWalletMutation.isPending ? "Creating…" : "Create Wallet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
