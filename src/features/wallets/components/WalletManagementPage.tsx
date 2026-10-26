"use client";

import * as React from "react";
import { Plus, Users, Wallet as WalletIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBaht } from "@/lib/utils";
import type { Wallet } from "@/types/wallet";
import { useWallets } from "@/features/wallets/hooks/useWallets";
import { CreateWalletDialog } from "./CreateWalletDialog";
import { EditWalletDialog } from "./EditWalletDialog";
import { SavingGoalDialog } from "./SavingGoalDialog";
import { DeleteWalletDialog } from "./DeleteWalletDialog";
import { InvitationsBanner } from "./InvitationsBanner";
import { LeaveWalletDialog, MembersDialog } from "./MembersDialog";
import { NotificationBell } from "./NotificationBell";
import { WalletCard } from "./WalletCard";

type WalletView = "personal" | "shared";

/**
 * Idle tabs read as normal text; the selected one turns green. Its soft tint-and-border (the same as a
 * wallet card, in the app's green) is the sliding `TabsIndicator` behind the triggers, so the trigger
 * itself stays transparent.
 */
const TAB_TRIGGER_CLASS =
  "gap-1.5 px-4 font-semibold text-foreground/75 transition-colors hover:text-foreground data-active:bg-transparent data-active:text-success data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-transparent";
const TAB_INDICATOR_CLASS = "rounded-md border border-primary/40 bg-primary/10";

export function WalletManagementPage() {
  const { data: wallets = [], isPending } = useWallets();

  const [selectedView, setSelectedView] = React.useState<WalletView>("personal");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingWallet, setEditingWallet] = React.useState<Wallet | null>(null);
  const [savingWallet, setSavingWallet] = React.useState<Wallet | null>(null);
  const [deletingWallet, setDeletingWallet] = React.useState<Wallet | null>(null);
  const [membersWalletId, setMembersWalletId] = React.useState<string | null>(null);
  const [leavingWalletId, setLeavingWalletId] = React.useState<string | null>(null);

  // Personal and shared wallets are shown one at a time, each with its own totals:
  // shared wallets are pooled with other people, so they never mix into the personal numbers.
  const personalWallets = React.useMemo(() => wallets.filter((w) => !w.isShared), [wallets]);
  const sharedWallets = React.useMemo(() => wallets.filter((w) => w.isShared), [wallets]);
  const hasShared = sharedWallets.length > 0;
  // Without shared wallets there is nothing to switch to (e.g. after leaving the last one).
  const view: WalletView = hasShared ? selectedView : "personal";

  // Dialogs look the wallet up by id so they follow live changes (role, member count) after a mutation.
  const membersWallet = wallets.find((w) => w.id === membersWalletId) ?? null;
  const leavingWallet = wallets.find((w) => w.id === leavingWalletId) ?? null;

  function renderCard(wallet: Wallet) {
    return (
      <WalletCard
        key={wallet.id}
        wallet={wallet}
        onEdit={(w) => setEditingWallet(w)}
        onEditSaving={(w) => setSavingWallet(w)}
        onDelete={(w) => setDeletingWallet(w)}
        onOpenMembers={(w) => setMembersWalletId(w.id)}
        onLeave={(w) => setLeavingWalletId(w.id)}
      />
    );
  }

  /** The two total cards for the personal wallets; shared wallets are pooled with other people, so they get no totals. */
  function renderOverview(shown: Wallet[]) {
    const total = shown.reduce((sum, w) => sum + w.balance, 0);
    const savingCount = shown.filter((w) => w.isSaving).length;

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl bg-gradient-pastel-a shadow-sm">
          <CardContent className="flex flex-col gap-1.5 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Balance
            </span>
            <div className="text-3xl font-extrabold text-foreground">
              {isPending ? (
                <Skeleton className="h-9 w-32" />
              ) : (
                formatBaht(total)
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              Across {shown.length} {shown.length === 1 ? "wallet" : "wallets"}
            </span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="flex flex-col gap-1.5 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Wallets
            </span>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-extrabold text-foreground">{shown.length}</div>
              <div className="text-sm font-semibold text-primary">({savingCount} saving)</div>
            </div>
            <span className="text-xs text-muted-foreground">
              Active accounts
            </span>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <NotificationBell />
            <Button type="button" onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="size-4" />
              <span>Create Wallet</span>
            </Button>
          </div>
        </div>

        <InvitationsBanner />

        <Tabs value={view} onValueChange={(next) => setSelectedView(next as WalletView)} className="gap-6">
          {hasShared ? (
            <TabsList
              aria-label="Wallet type"
              className="relative h-11 w-fit border border-border bg-card p-1 shadow-sm group-data-horizontal/tabs:h-11"
            >
              <TabsIndicator className={TAB_INDICATOR_CLASS} />
              <TabsTrigger value="personal" className={TAB_TRIGGER_CLASS}>
                Personal{" "}
                <span className="text-xs font-bold opacity-80">{personalWallets.length}</span>
              </TabsTrigger>
              <TabsTrigger value="shared" className={TAB_TRIGGER_CLASS}>
                <Users />
                Shared{" "}
                <span className="text-xs font-bold opacity-80">{sharedWallets.length}</span>
              </TabsTrigger>
            </TabsList>
          ) : null}

          <TabsContent value="personal" className="flex flex-col gap-6">
            {renderOverview(personalWallets)}

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Your Wallets</h2>
                <span className="text-xs text-muted-foreground">
                  {personalWallets.length} {personalWallets.length === 1 ? "wallet" : "wallets"} recorded
                </span>
              </div>

              {isPending ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Skeleton className="h-48 rounded-2xl" />
                  <Skeleton className="h-48 rounded-2xl" />
                  <Skeleton className="h-48 rounded-2xl" />
                </div>
              ) : personalWallets.length === 0 ? (
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
                  {personalWallets.map(renderCard)}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="shared" className="flex flex-col gap-6">
            <section aria-label="Shared wallets" className="flex flex-col gap-4">
              <div className="flex items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Users className="size-[18px] text-accent" aria-hidden />
                    Shared Wallets
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Wallets you share with other people. Their balances are not part of your personal totals.
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {sharedWallets.length} shared {sharedWallets.length === 1 ? "wallet" : "wallets"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sharedWallets.map(renderCard)}
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CreateWalletDialog
        key={view}
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultShared={view === "shared"}
      />

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

      <MembersDialog
        wallet={membersWallet}
        open={membersWallet !== null}
        onOpenChange={(open) => {
          if (!open) setMembersWalletId(null);
        }}
      />

      <LeaveWalletDialog
        wallet={leavingWallet}
        open={leavingWallet !== null}
        onOpenChange={(open) => {
          if (!open) setLeavingWalletId(null);
        }}
      />
    </main>
  );
}
