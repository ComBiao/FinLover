"use client";

import * as React from "react";
import { Check } from "lucide-react";

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
import type { Wallet } from "@/types/wallet";
import { useUpdateWallet } from "@/features/wallets/hooks/useWallets";

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

type EditWalletFormProps = {
  wallet: Wallet;
  onSuccess: () => void;
};

function EditWalletForm({ wallet, onSuccess }: EditWalletFormProps) {
  const [name, setName] = React.useState(wallet.name);
  const [color, setColor] = React.useState(wallet.color ?? PRESET_COLORS[0]);
  const [error, setError] = React.useState<string | null>(null);

  const updateWalletMutation = useUpdateWallet();

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

    setError(null);

    try {
      await updateWalletMutation.mutateAsync({
        id: wallet.id,
        input: { name: trimmedName, color },
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update wallet");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Edit Wallet</DialogTitle>
      </DialogHeader>

      {error ? (
        <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-wallet-name">Wallet Name</Label>
        <Input
          id="edit-wallet-name"
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

      <DialogFooter className="mt-4 gap-2">
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={updateWalletMutation.isPending}>
          {updateWalletMutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type EditWalletDialogProps = {
  wallet: Wallet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditWalletDialog({ wallet, open, onOpenChange }: EditWalletDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {wallet ? (
          <EditWalletForm
            key={wallet.id}
            wallet={wallet}
            onSuccess={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
