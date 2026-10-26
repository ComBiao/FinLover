"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AddTransactionModal } from "@/features/transactions/components/AddTransactionModal";
import { DeleteTransactionDialog } from "@/features/transactions/components/DeleteTransactionDialog";
import { TransactionFilterBar } from "@/features/transactions/components/TransactionFilterBar";
import { TransactionTable } from "@/features/transactions/components/TransactionTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSharedWalletPeriodTransactions, useTransactions } from "@/features/transactions/hooks/useTransactions";
import { useTransactionSummary } from "@/features/transactions/hooks/useTransactionSummary";
import {
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
} from "@/features/transactions/hooks/useTransactionMutations";
import { filterTransactions, summarizeTransactions, withFallbackCategory } from "@/features/transactions/transactions";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useWallets } from "@/features/wallets/hooks/useWallets";
import { periodMonthKeys } from "@/features/transactions/period";
import { restoreTransactionFilters, useTransactionFilters } from "@/features/transactions/store/useTransactionFilters";
import { useTransactionModal } from "@/features/transactions/store/useTransactionModal";
import type { Transaction, TransactionFilters } from "@/types/transaction";

import { SummaryCards } from "./SummaryCards";

/**
 * Transaction management page: filterable/searchable list of every
 * transaction with edit/delete actions per row. The transaction list itself
 * comes from the shared `useTransactions` query for the months the selected
 * period covers (Home reads the same query), so a change made from either
 * page is visible in both.
 */
export default function TransactionsPage() {
  const [filtersRestored, setFiltersRestored] = useState(false);
  useEffect(() => {
    queueMicrotask(() => {
      restoreTransactionFilters();
      setFiltersRestored(true);
    });
  }, []);
  const period = useTransactionFilters((state) => state.period);
  const months = useMemo(() => periodMonthKeys(period), [period]);
  const { data: transactions = [] } = useTransactions(months);
  const { data: categories = [] } = useCategories();
  const { data: wallets = [], isPending: isWalletsPending } = useWallets();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const filters = useTransactionFilters((state) => state.filters);
  const setFilters = useTransactionFilters((state) => state.setFilters);
  const setPeriod = useTransactionFilters((state) => state.setPeriod);
  const setPeriodMode = useTransactionFilters((state) => state.setMode);
  const resetFilters = useTransactionFilters((state) => state.resetFilters);
  const openModal = useTransactionModal((state) => state.openModal);
  const openEditModal = useTransactionModal((state) => state.openEditModal);
  const editingTransaction = useTransactionModal((state) => state.editingTransaction);
  const openDeleteModal = useTransactionModal((state) => state.openDeleteModal);
  const closeDeleteModal = useTransactionModal((state) => state.closeDeleteModal);
  const deletingTransaction = useTransactionModal((state) => state.deletingTransaction);

  // The wallet filter is shared with Home and the Wallets page, so a wallet picked there (shared or
  // personal) opens here. An id that no longer resolves (wallet deleted, or the user left it) falls
  // back to "All wallets", which lists personal wallets only.
  const selectedWallet = filters.walletId ? wallets.find((wallet) => wallet.id === filters.walletId) : undefined;
  const isSharedView = Boolean(selectedWallet?.isShared);
  const walletFilterId = isWalletsPending ? filters.walletId : selectedWallet?.id;
  // Personal wallets filter by `categoryId`, shared ones by the preset `categoryKey`: ignore the other kind's.
  const effectiveFilters = useMemo<TransactionFilters>(
    () => ({
      ...filters,
      walletId: walletFilterId,
      categoryId: isSharedView ? undefined : filters.categoryId,
      categoryKey: isSharedView ? filters.categoryKey : undefined,
    }),
    [filters, walletFilterId, isSharedView]
  );

  // Switching between a personal and a shared wallet drops the category: the two lists differ.
  function handleFiltersChange(next: TransactionFilters) {
    const isShared = (walletId?: string) => Boolean(wallets.find((wallet) => wallet.id === walletId)?.isShared);
    if (isShared(next.walletId) !== isShared(effectiveFilters.walletId)) {
      setFilters({ ...next, categoryId: undefined, categoryKey: undefined });
      return;
    }
    setFilters(next);
  }

  // The server totals personal wallets only; a shared wallet's rows are all loaded, so the page totals them.
  const { data: serverSummary, isPending: isServerSummaryPending } = useTransactionSummary(period, effectiveFilters, {
    enabled: !isWalletsPending && !isSharedView,
  });
  const { data: sharedTransactions = [], isPending: isSharedPending } = useSharedWalletPeriodTransactions(
    isSharedView ? selectedWallet?.id : undefined,
    months
  );

  const filteredTransactions = useMemo(
    () =>
      isSharedView
        ? filterTransactions(sharedTransactions, effectiveFilters)
        : filterTransactions(
            withFallbackCategory(
              transactions.filter((transaction) => !wallets.find((wallet) => wallet.id === transaction.walletId)?.isShared),
              categories
            ),
            effectiveFilters
          ),
    [isSharedView, sharedTransactions, transactions, wallets, categories, effectiveFilters]
  );
  const summary = isSharedView ? summarizeTransactions(filteredTransactions) : serverSummary;
  const isSummaryPending = isSharedView ? isSharedPending : isServerSummaryPending;

  function handleDeleteTransaction(id: string) {
    deleteTransaction.mutate(id, {
      onSuccess: () => toast.success("Transaction deleted successfully"),
      onError: () => toast.error("Couldn't delete this transaction"),
    });
  }

  /** US3-1: persists via `POST /api/v1/transactions`; the mutation hook refetches the list. */
  async function handleAddTransaction(input: Omit<Transaction, "id">) {
    await createTransaction.mutateAsync(input);
    toast.success("Transaction added successfully");
  }

  /** US3-2: persists via `PUT /api/v1/transactions/:id`; a rejection is shown inside the modal. */
  async function handleEditTransaction(updatedTransaction: Transaction) {
    const { id, ...input } = updatedTransaction;
    await updateTransaction.mutateAsync({ id, input });
    toast.success("Transaction updated");
  }

  if (!filtersRestored || isWalletsPending) {
    return <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6"><Skeleton className="h-8 w-48" /><div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-36 rounded-xl" /><Skeleton className="h-36 rounded-xl" /><Skeleton className="h-36 rounded-xl" /></div><Skeleton className="h-14 rounded-xl" /><Skeleton className="h-52 rounded-xl" /></main>;
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">Transactions</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              View, search, and manage every transaction.
            </p>
          </div>
          <Button type="button" onClick={() => openModal(undefined, isSharedView ? selectedWallet?.id : undefined)}>
            <Plus className="size-4" />
            Add Transaction
          </Button>
        </div>

        <SummaryCards summary={summary} period={period} isLoading={isSummaryPending} />

        <TransactionFilterBar
          value={effectiveFilters}
          categories={categories}
          sharedWallet={isSharedView}
          onValueChange={handleFiltersChange}
          period={period}
          onPeriodChange={setPeriod}
          onPeriodModeChange={setPeriodMode}
          onReset={resetFilters}
        />

        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">All Transaction</h2>
          <span className="text-sm text-muted-foreground">
            {filteredTransactions.length}{" "}
            {filteredTransactions.length === 1 ? "transaction" : "transactions"}
          </span>
        </div>

        <TransactionTable
          transactions={filteredTransactions}
          onEdit={openEditModal}
          onDeleteRequest={openDeleteModal}
        />
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
