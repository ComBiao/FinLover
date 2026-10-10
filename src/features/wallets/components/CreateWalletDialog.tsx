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
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateWallet } from "@/features/wallets/hooks/useWallets";

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

type CreateWalletDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateWalletDialog({ open, onOpenChange }: CreateWalletDialogProps) {
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState(PRESET_COLORS[0]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [goalAmount, setGoalAmount] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const createWalletMutation = useCreateWallet();

  function resetForm() {
    setName("");
    setColor(PRESET_COLORS[0]);
    setIsSaving(false);
    setGoalAmount("");
    setError(null);
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

    setError(null);

    try {
      await createWalletMutation.mutateAsync({
        name: trimmedName,
        color,
        isSaving,
        goalAmount: parsedGoal,
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
      <DialogContent className="sm:max-w-[425px]">
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

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="create-wallet-is-saving"
              checked={isSaving}
              onCheckedChange={(checked) => setIsSaving(Boolean(checked))}
            />
            <Label htmlFor="create-wallet-is-saving" className="cursor-pointer font-medium">
              This is a saving wallet with a goal
            </Label>
          </div>

          {isSaving ? (
            <div className="flex flex-col gap-2 pl-6">
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
