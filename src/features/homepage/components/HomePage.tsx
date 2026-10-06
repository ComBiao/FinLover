"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AddTransactionModal } from "@/features/transactions/components/AddTransactionModal";
import { DeleteTransactionDialog } from "@/features/transactions/components/DeleteTransactionDialog";
import { TransactionTable } from "@/features/transactions/components/TransactionTable";
import { Button } from "@/components/ui/button";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import {
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
} from "@/features/transactions/hooks/useTransactionMutations";
import { useWallets } from "@/features/transactions/hooks/useWallets";
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
import { userName } from "@/mocks/mock-data";

function monthKeyOfDate(date: Date): MonthKey {
  return formatMonthKey(date.getFullYear(), date.getMonth() + 1);
}

export function HomePage() {
  const [month, setMonth] = React.useState<MonthKey>(() => currentMonthKey());
  const [walletId, setWalletId] = React.useState<string>("all");

  const { data: wallets = [] } = useWallets();
  const { data: transactions = [] } = useTransactions();
  const { data: summary } = useHomeSummary(month, walletId);

  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const openModal = useTransactionModal((state) => state.openModal);
  const openEditModal = useTransactionModal((state) => state.openEditModal);
  const editingTransaction = useTransactionModal((state) => state.editingTransaction);
  const openDeleteModal = useTransactionModal((state) => state.openDeleteModal);
  const closeDeleteModal = useTransactionModal((state) => state.closeDeleteModal);
  const deletingTransaction = useTransactionModal((state) => state.deletingTransaction);

  const monthTransactions = React.useMemo(
    () =>
      transactions
        .filter(
          (transaction) =>
            (walletId === "all" || transaction.walletId === walletId) &&
            isDateInMonth(transaction.date, month)
        )
        .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [transactions, walletId, month]
  );

  const monthLabel = monthKeyLabel(month);
  const selectedWalletName = walletId === "all" ? "All wallets" : wallets.find((w) => w.id === walletId)?.name ?? "Wallet";

  function handleAddTransaction(newTransaction: Transaction) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the modal assigns a throwaway client-side id; the mock service assigns its own.
    const { id: _clientId, ...input } = newTransaction;
    createTransaction.mutate(input, {
      onSuccess: (created) => {
        setMonth(monthKeyOfDate(created.date));
        toast.success("Transaction added");
      },
      onError: () => toast.error("Couldn't save this transaction"),
    });
  }

  function handleEditTransaction(updatedTransaction: Transaction) {
    const { id, ...input } = updatedTransaction;
    updateTransaction.mutate(
      { id, input },
      {
        onSuccess: (updated) => {
          setMonth(monthKeyOfDate(updated.date));
          toast.success("Transaction updated");
        },
        onError: () => toast.error("Couldn't update this transaction"),
      }
    );
  }

  function handleDeleteTransaction(id: string) {
    deleteTransaction.mutate(id, {
      onSuccess: () => toast.success("Transaction deleted"),
      onError: () => toast.error("Couldn't delete this transaction"),
    });
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-[22px] pb-28">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-3.5">
            <div>
              <div suppressHydrationWarning className="text-2xl font-extrabold text-foreground sm:text-3xl">
                {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, {userName}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Here&apos;s your money at a glance.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <MonthPicker value={month} onValueChange={setMonth} />
              <WalletDropdown wallets={wallets} value={walletId} onValueChange={setWalletId} />
            </div>
          </div>

          <Button
            type="button"
            onClick={() => openModal(undefined, walletId === "all" ? undefined : walletId)}
          >
            <Plus className="size-4" />
            Add Transaction
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
          <TotalBalanceCard
            walletLabel={selectedWalletName}
            hasWallets={summary?.balance.hasWallets ?? wallets.length > 0}
            totalBalance={summary?.balance.totalBalance ?? 0}
            savingGoal={summary?.balance.savingGoal ?? null}
          />
          <SpentCard monthLabel={monthLabel} amount={summary?.expense ?? 0} />
          <IncomeCard monthLabel={monthLabel} amount={summary?.income ?? 0} />
          <NetCard
            monthLabel={monthLabel}
            net={summary?.net.net ?? 0}
            status={summary?.net.status ?? "even"}
            income={summary?.income ?? 0}
            expense={summary?.expense ?? 0}
          />
          <TopCategoriesCard monthLabel={monthLabel} topCategories={summary?.topCategories ?? []} />
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Transactions · {monthLabel}</h2>
          <span className="text-sm text-muted-foreground">
            {monthTransactions.length}{" "}
            {monthTransactions.length === 1 ? "transaction" : "transactions"}
          </span>
        </div>

        {monthTransactions.length === 0 ? (
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
