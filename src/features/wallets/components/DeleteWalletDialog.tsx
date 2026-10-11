"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Wallet } from "@/types/wallet";
import { useDeleteWallet } from "@/features/wallets/hooks/useWallets";

type DeleteWalletDialogProps = {
  wallet: Wallet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteWalletDialog({ wallet, open, onOpenChange }: DeleteWalletDialogProps) {
  const [error, setError] = React.useState<string | null>(null);
  const deleteWalletMutation = useDeleteWallet();

  function handleOpenChange(next: boolean) {
    if (!next) setError(null);
    onOpenChange(next);
  }

  async function handleConfirmDelete() {
    if (!wallet) return;

    try {
      await deleteWalletMutation.mutateAsync(wallet.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete wallet");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <span className="flex size-9 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="size-5" />
            </span>
            <AlertDialogTitle>Delete Wallet</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2 pt-2 text-left">
            <p className="font-semibold text-foreground">
              Are you sure you want to delete &ldquo;{wallet?.name}&rdquo;?
            </p>
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <strong>Warning:</strong> All transactions associated with this wallet will be permanently
              deleted from your account. This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error ? (
          <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={deleteWalletMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={deleteWalletMutation.isPending}
          >
            {deleteWalletMutation.isPending ? "Deleting…" : "Delete Wallet and Transactions"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

