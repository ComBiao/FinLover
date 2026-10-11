"use client";

import * as React from "react";
import { PiggyBank } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import type { Wallet } from "@/types/wallet";
import { useUpdateWalletSaving } from "@/features/wallets/hooks/useWallets";

type SavingGoalFormProps = {
  wallet: Wallet;
  onSuccess: () => void;
};

function SavingGoalForm({ wallet, onSuccess }: SavingGoalFormProps) {
  const [isSaving, setIsSaving] = React.useState(() => Boolean(wallet.isSaving));
  const [goalAmount, setGoalAmount] = React.useState(() => {
    const goal = wallet.savingGoal ?? wallet.goalAmount;
    return goal ? String(goal) : "";
  });
  const [error, setError] = React.useState<string | null>(null);

  const updateSavingMutation = useUpdateWalletSaving();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

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
      await updateSavingMutation.mutateAsync({
        id: wallet.id,
        input: {
          isSaving,
          goalAmount: parsedGoal,
        },
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update saving goal");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PiggyBank className="size-4" />
          </span>
          <DialogTitle>Saving Goal — {wallet.name}</DialogTitle>
        </div>
        <DialogDescription>
          Set up a target amount to track your savings progress for this wallet.
        </DialogDescription>
      </DialogHeader>

      {error ? (
        <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex items-center space-x-2 pt-2">
        <Checkbox
          id="saving-toggle"
          checked={isSaving}
          onCheckedChange={(checked) => setIsSaving(Boolean(checked))}
        />
        <Label htmlFor="saving-toggle" className="cursor-pointer font-medium">
          Enable saving goal for this wallet
        </Label>
      </div>

      {isSaving ? (
        <div className="flex flex-col gap-2 pl-6">
          <Label htmlFor="saving-goal-amount">Target Goal Amount (฿)</Label>
          <Input
            id="saving-goal-amount"
            type="number"
            min="0.01"
            step="any"
            placeholder="e.g. 20000"
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value)}
            required={isSaving}
          />
        </div>
      ) : (
        <p className="pl-6 text-xs text-muted-foreground">
          Disabling saving will clear the goal amount. Your wallet balance will never be changed.
        </p>
      )}

      <DialogFooter className="mt-4 gap-2">
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={updateSavingMutation.isPending}>
          {updateSavingMutation.isPending ? "Saving…" : "Save Goal"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type SavingGoalDialogProps = {
  wallet: Wallet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SavingGoalDialog({ wallet, open, onOpenChange }: SavingGoalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {wallet ? (
          <SavingGoalForm
            key={wallet.id}
            wallet={wallet}
            onSuccess={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
