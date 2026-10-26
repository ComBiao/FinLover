"use client";

import * as React from "react";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { AddTransactionModal } from "@/features/transactions/components/AddTransactionModal";
import { DeleteTransactionDialog } from "@/features/transactions/components/DeleteTransactionDialog";
import { TransactionTable } from "@/features/transactions/components/TransactionTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import {
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
} from "@/features/transactions/hooks/useTransactionMutations";
import { useWallets } from "@/features/wallets/hooks/useWallets";
import { MembersDialog } from "@/features/wallets/components/MembersDialog";
import { NotificationBell } from "@/features/wallets/components/NotificationBell";
import { useSharedWalletTransactions } from "@/features/wallets/shared/hooks";
import { useTransactionModal } from "@/features/transactions/store/useTransactionModal";
import type { Transaction } from "@/types/transaction";

import { MonthPicker } from "@/features/homepage/components/MonthPicker";
import { WalletDropdown } from "@/features/homepage/components/WalletDropdown";
import {
  IncomeCard,
  NetCard,
  SpentCard,
  TopCategoriesCard,
  TotalBalanceCard,
} from "@/features/homepage/components/HomeCards";
import { useHomeSummary } from "@/features/homepage/hooks/useHomeSummary";
import {
  currentMonthKey,
  formatMonthKey,
  isDateInMonth,
  monthKeyLabel,
  type MonthKey,
} from "@/features/homepage/month";
import { displayName, useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

import { useActiveWallet } from "@/features/wallets/store/useActiveWallet";
import { useSessionPageState } from "@/hooks/useSessionPageState";

function monthKeyOfDate(date: Date): MonthKey {
  return formatMonthKey(date.getFullYear(), date.getMonth() + 1);
}
const isMonthKey = (value: string): value is MonthKey => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

export function HomePage() {
  const [month, setMonth, monthRestored] = useSessionPageState("homeMonth", currentMonthKey(), isMonthKey);
  const walletId = useActiveWallet((state) => state.activeWalletId);
  const setWalletId = useActiveWallet((state) => state.setActiveWalletId);
  const [walletRestored, setWalletRestored] = React.useState(false);

  React.useEffect(() => {
    queueMicrotask(() => {
      try {
        const savedWalletId = window.sessionStorage.getItem("activeWalletId");
        if (savedWalletId && savedWalletId !== useActiveWallet.getState().activeWalletId) {
          setWalletId(savedWalletId);
        }
      } catch (error) {
        console.warn("Could not restore the active wallet", error);
      } finally {
        setWalletRestored(true);
      }
    });
  }, [setWalletId]);

  const { data: wallets = [], isPending: isWalletsPending, isSuccess: isWalletsLoaded } = useWallets();
  const { data: currentUser } = useCurrentUser();

  // The summary API answers 404 for a wallet that no longer exists (e.g. just
  // deleted), so fall back to the combined view instead of an error state.
  React.useEffect(() => {
    if (walletRestored && isWalletsLoaded && walletId !== "all" && !wallets.some((wallet) => wallet.id === walletId)) {
      setWalletId("all");
    }
  }, [walletRestored, isWalletsLoaded, wallets, walletId, setWalletId]);
  // Memoized so the query key stays stable between renders (avoids refetch loops)
  const months = React.useMemo(() => [month], [month]);
  const { data: personalRows = [], isPending: isPersonalPending } = useTransactions(months);

  // A shared wallet's rows come from every member, so they have their own query.
  const selectedWallet = wallets.find((wallet) => wallet.id === walletId);
  const isSharedSelected = Boolean(selectedWallet?.isShared);
  const { data: sharedRows = [], isPending: isSharedPending } = useSharedWalletTransactions(
    isSharedSelected ? walletId : undefined,
    month
  );
  const transactions = isSharedSelected ? sharedRows : personalRows;
  const isTransactionsPending = isSharedSelected ? isSharedPending : isPersonalPending;
  const [membersOpen, setMembersOpen] = React.useState(false);
  const {
    data: summary,
    isPending: isSummaryPending,
  } = useHomeSummary(month, walletId);

  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const openModal = useTransactionModal((state) => state.openModal);
  const openEditModal = useTransactionModal((state) => state.openEditModal);
  const editingTransaction = useTransactionModal((state) => state.editingTransaction);
  const openDeleteModal = useTransactionModal((state) => state.openDeleteModal);
  const closeDeleteModal = useTransactionModal((state) => state.closeDeleteModal);
  const deletingTransaction = useTransactionModal((state) => state.deletingTransaction);

  const sharedWalletIds = React.useMemo(
    () => new Set(wallets.filter((wallet) => wallet.isShared).map((wallet) => wallet.id)),
    [wallets]
  );
  const monthTransactions = React.useMemo(
    () =>
      transactions
        .filter(
          (transaction) =>
            // "All wallets" is the personal view: rows logged into shared wallets stay out of it.
            (walletId === "all" ? !sharedWalletIds.has(transaction.walletId) : transaction.walletId === walletId) &&
            isDateInMonth(transaction.date, month)
        )
        .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [transactions, walletId, month, sharedWalletIds]
  );

  const monthLabel = monthKeyLabel(month);
  const selectedWalletName = walletId === "all" ? "All wallets" : wallets.find((w) => w.id === walletId)?.name ?? "Wallet";

  async function handleAddTransaction(input: Omit<Transaction, "id">) {
    try {
      const created = await createTransaction.mutateAsync(input);
      setMonth(monthKeyOfDate(created.date));
      toast.success("Transaction added");
    } catch {
      toast.error("Couldn't save this transaction");
    }
  }

  async function handleEditTransaction(updatedTransaction: Transaction) {
    const { id, ...input } = updatedTransaction;
    const updated = await updateTransaction.mutateAsync({ id, input });
    setMonth(monthKeyOfDate(updated.date));
    toast.success("Transaction updated");
  }

  function handleDeleteTransaction(id: string) {
    deleteTransaction.mutate(id, {
      onSuccess: () => toast.success("Transaction deleted"),
      onError: () => toast.error("Couldn't delete this transaction"),
    });
  }

  if (!walletRestored || !monthRestored || isWalletsPending || (isWalletsLoaded && walletId !== "all" && !selectedWallet)) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 sm:px-10 sm:py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-[22px]">
          <Skeleton className="h-9 w-64" />
          <div className="flex gap-3">
            <Skeleton className="h-[54px] w-44" />
            <Skeleton className="h-[54px] w-44" />
          </div>
          <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-40 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-52 rounded-xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-[22px] pb-28">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-3.5">
            <div>
              <div suppressHydrationWarning className="text-2xl font-extrabold text-foreground sm:text-3xl">
                {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}{currentUser ? `, ${displayName(currentUser)}` : ''}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Here&apos;s your money at a glance.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <MonthPicker value={month} onValueChange={setMonth} />
              <WalletDropdown wallets={wallets} value={walletId} onValueChange={setWalletId} />
              {isSharedSelected ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-[54px] gap-2 px-3.5 font-bold"
                  onClick={() => setMembersOpen(true)}
                >
                  <Users className="size-4" />
                  {selectedWallet?.memberCount ?? 0}{" "}
                  {selectedWallet?.memberCount === 1 ? "member" : "members"}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button
              type="button"
              onClick={() => openModal(undefined, walletId === "all" ? undefined : walletId)}
            >
              <Plus className="size-4" />
              Add Transaction
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
          <TotalBalanceCard
            walletLabel={selectedWalletName}
            hasWallets={summary?.balance.hasWallets ?? wallets.length > 0}
            totalBalance={summary?.balance.totalBalance ?? 0}
            savingGoal={summary?.balance.savingGoal ?? null}
            isLoading={isSummaryPending}
          />
          <SpentCard monthLabel={monthLabel} amount={summary?.expense ?? 0} isLoading={isSummaryPending} />
          <IncomeCard monthLabel={monthLabel} amount={summary?.income ?? 0} isLoading={isSummaryPending} />
          <NetCard
            monthLabel={monthLabel}
            net={summary?.net.net ?? 0}
            status={summary?.net.status ?? "even"}
            income={summary?.income ?? 0}
            expense={summary?.expense ?? 0}
            isLoading={isSummaryPending}
          />
          <TopCategoriesCard
            monthLabel={monthLabel}
            topCategories={summary?.topCategories ?? []}
            isLoading={isSummaryPending}
          />
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Transactions · {monthLabel}</h2>
          {isTransactionsPending ? null : (
            <span className="text-sm text-muted-foreground">
              {monthTransactions.length}{" "}
              {monthTransactions.length === 1 ? "transaction" : "transactions"}
            </span>
          )}
        </div>

        {isTransactionsPending ? null : monthTransactions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-5 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">No transactions this month yet</p>
            <p className="text-sm text-muted-foreground">
              Nothing recorded in {selectedWalletName} for {monthLabel}.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={() => openModal(undefined, walletId === "all" ? undefined : walletId)}
            >
              Add a transaction
            </Button>
          </div>
        ) : (
          <TransactionTable
            transactions={monthTransactions}
            onEdit={openEditModal}
            onDeleteRequest={openDeleteModal}
          />
        )}
      </div>

      <MembersDialog
        wallet={isSharedSelected ? (selectedWallet ?? null) : null}
        open={membersOpen && isSharedSelected}
        onOpenChange={setMembersOpen}
      />

      <AddTransactionModal
        initialData={editingTransaction}
        onAdd={handleAddTransaction}
        onEdit={handleEditTransaction}
      />

      <DeleteTransactionDialog
        open={deletingTransaction !== null}
        onOpenChange={(open) => {
          if (!open) closeDeleteModal();
        }}
        transactionTitle={deletingTransaction?.title}
        onConfirm={() => {
          if (deletingTransaction) handleDeleteTransaction(deletingTransaction.id);
        }}
      />
    </main>
  );
}
