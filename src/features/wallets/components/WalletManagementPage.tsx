"use client";

import * as React from "react";
import { Eye, EyeOff, Plus, Wallet as WalletIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBaht } from "@/lib/utils";
import type { Wallet } from "@/types/wallet";
import { useWallets } from "@/features/wallets/hooks/useWallets";
import { useActiveWallet } from "@/features/wallets/store/useActiveWallet";
import { useBalanceVisibility } from "@/features/wallets/store/useBalanceVisibility";
import { CreateWalletDialog } from "./CreateWalletDialog";
import { EditWalletDialog } from "./EditWalletDialog";
import { SavingGoalDialog } from "./SavingGoalDialog";
import { DeleteWalletDialog } from "./DeleteWalletDialog";
import { WalletCard } from "./WalletCard";

export function WalletManagementPage() {
  const { data: wallets = [], isPending, isError } = useWallets();

  const isVisible = useBalanceVisibility((state) => state.isVisible);
  const toggleVisibility = useBalanceVisibility((state) => state.toggle);
  const onError = useBalanceVisibility((state) => state.onError);

  const activeWalletId = useActiveWallet((state) => state.activeWalletId);
  const setActiveWalletId = useActiveWallet((state) => state.setActiveWalletId);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingWallet, setEditingWallet] = React.useState<Wallet | null>(null);
  const [savingWallet, setSavingWallet] = React.useState<Wallet | null>(null);
  const [deletingWallet, setDeletingWallet] = React.useState<Wallet | null>(null);

  // If fetching wallets fails, revert balance visibility to hidden (#78)
  React.useEffect(() => {
    if (isError) {
      onError();
    }
  }, [isError, onError]);

  const totalBalance = React.useMemo(
    () => wallets.reduce((sum, w) => sum + w.balance, 0),
    [wallets]
  );

  const activeWallet = React.useMemo(
    () => wallets.find((w) => w.id === activeWalletId),
    [wallets, activeWalletId]
  );

  return (
    <main className="min-h-screen bg-background px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-28">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">Wallets</h1>
            <p className="text-sm text-muted-foreground">
              Manage your spending accounts, savings goals, and payment sources.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleVisibility}
              className="gap-1.5"
              aria-label={isVisible ? "Hide all balances" : "Show all balances"}
            >
              {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              <span>{isVisible ? "Hide Balances" : "Show Balances"}</span>
            </Button>

            <Button type="button" onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="size-4" />
              <span>Create Wallet</span>
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="rounded-2xl bg-gradient-pastel-a shadow-sm">
            <CardContent className="flex flex-col gap-1.5 p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Balance
              </span>
              <div className="text-3xl font-extrabold text-foreground">
                {isPending ? (
                  <Skeleton className="h-9 w-32" />
                ) : isVisible ? (
                  formatBaht(totalBalance)
                ) : (
                  "••••••"
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                Across {wallets.length} {wallets.length === 1 ? "wallet" : "wallets"}
              </span>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardContent className="flex flex-col gap-1.5 p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Wallets
              </span>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-extrabold text-foreground">
                  {wallets.length}
                </div>
                <div className="text-sm font-semibold text-primary">
                  ({wallets.filter((w) => w.isSaving).length} saving)
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                Active accounts
              </span>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardContent className="flex flex-col gap-1.5 p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Wallet
              </span>
              <div className="truncate text-xl font-bold text-foreground">
                {activeWalletId === "all" ? "All Wallets (Combined)" : activeWallet?.name ?? "None"}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setActiveWalletId("all")}
                >
                  Switch to All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wallets Grid */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Your Wallets</h2>
            <span className="text-xs text-muted-foreground">
              {wallets.length} {wallets.length === 1 ? "wallet" : "wallets"} recorded
            </span>
          </div>

          {isPending ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </div>
          ) : wallets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <WalletIcon className="size-6" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-foreground">No wallets created yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first wallet to track income and expenses.
                </p>
              </div>
              <Button type="button" onClick={() => setCreateOpen(true)} className="mt-2 gap-1.5">
                <Plus className="size-4" />
                Create Wallet
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {wallets.map((wallet) => (
                <WalletCard
                  key={wallet.id}
                  wallet={wallet}
                  onEdit={(w) => setEditingWallet(w)}
                  onEditSaving={(w) => setSavingWallet(w)}
                  onDelete={(w) => setDeletingWallet(w)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateWalletDialog open={createOpen} onOpenChange={setCreateOpen} />

      <EditWalletDialog
        wallet={editingWallet}
        open={editingWallet !== null}
        onOpenChange={(open) => {
          if (!open) setEditingWallet(null);
        }}
      />

      <SavingGoalDialog
        wallet={savingWallet}
        open={savingWallet !== null}
        onOpenChange={(open) => {
          if (!open) setSavingWallet(null);
        }}
      />

      <DeleteWalletDialog
        wallet={deletingWallet}
        open={deletingWallet !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingWallet(null);
        }}
      />
    </main>
  );
}

