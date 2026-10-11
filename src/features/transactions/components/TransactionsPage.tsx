"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AddTransactionModal } from "@/features/transactions/components/AddTransactionModal";
import { DeleteTransactionDialog } from "@/features/transactions/components/DeleteTransactionDialog";
import { TransactionFilterBar } from "@/features/transactions/components/TransactionFilterBar";
import { TransactionTable } from "@/features/transactions/components/TransactionTable";
import { Button } from "@/components/ui/button";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import {
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
} from "@/features/transactions/hooks/useTransactionMutations";
import { filterTransactions } from "@/features/transactions/transactions";
import { periodMonthKeys } from "@/features/transactions/period";
import { useTransactionFilters } from "@/features/transactions/store/useTransactionFilters";
import { useTransactionModal } from "@/features/transactions/store/useTransactionModal";
import type { Transaction } from "@/types/transaction";

import { SummaryCards } from "./SummaryCards";

/**
 * Transaction management page: filterable/searchable list of every
 * transaction with edit/delete actions per row. The transaction list itself
 * comes from the shared `useTransactions` query for the months the selected
 * period covers (Home reads the same query), so a change made from either
 * page is visible in both.
 */
export default function TransactionsPage() {
  const period = useTransactionFilters((state) => state.period);
  const months = useMemo(() => periodMonthKeys(period), [period]);
  const { data: transactions = [] } = useTransactions(months);
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

  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, filters),
    [transactions, filters]
  );

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
          <Button type="button" onClick={() => openModal()}>
            <Plus className="size-4" />
            Add Transaction
          </Button>
        </div>

        <SummaryCards transactions={filteredTransactions} />

        <TransactionFilterBar
          value={filters}
          onValueChange={setFilters}
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
