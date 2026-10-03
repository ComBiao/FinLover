"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AddTransactionModal } from "@/features/transactions/components/AddTransactionModal";
import { DeleteTransactionDialog } from "@/features/transactions/components/DeleteTransactionDialog";
import { TransactionFilterBar } from "@/features/transactions/components/TransactionFilterBar";
import { TransactionTable } from "@/features/transactions/components/TransactionTable";
import { Button } from "@/components/ui/button";
import { postApi } from "@/lib/api/client";
import { toLocalISODate } from "@/lib/utils";
import { MOCK_TRANSACTIONS } from "@/features/transactions/mockTransactions";
import { filterTransactions } from "@/features/transactions/transactions";
import { useTransactionFilters } from "@/features/transactions/store/useTransactionFilters";
import { useTransactionModal } from "@/features/transactions/store/useTransactionModal";
import type { Transaction } from "@/types/transaction";

import { SummaryCards } from "./SummaryCards";

/**
 * Transaction management page: filterable/searchable list of every
 * transaction with edit/delete actions per row.
 */
export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const filters = useTransactionFilters((state) => state.filters);
  const setFilters = useTransactionFilters((state) => state.setFilters);
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

  /**
   * TODO: integrate the v1 transaction API when replacing mock data with server data.
   */
  function handleDeleteTransaction(id: string) {
    setTransactions((prev) => prev.filter((transaction) => transaction.id !== id));
    toast.success("Transaction deleted successfully");
  }

  const createTransactionMutation = useMutation({
    mutationFn: (input: Omit<Transaction, "id">) =>
      postApi<{ id: string }>("/api/v1/transactions", {
        walletId: input.walletId,
        categoryId: input.categoryId ?? null,
        type: input.type,
        amount: input.amount,
        date: toLocalISODate(input.date),
        title: input.title,
        note: input.note,
      }),
  });

  /**
   * US3-1: persists via `POST /api/v1/transactions`, then prepends the
   * server-assigned id to local state. There is no `GET` list endpoint yet
   * (same limitation as #101's category list — tracked separately), so a
   * hard refresh still reloads `MOCK_TRANSACTIONS`; the create itself is
   * real.
   */
  async function handleAddTransaction(input: Omit<Transaction, "id">) {
    const created = await createTransactionMutation.mutateAsync(input);
    setTransactions((prev) => [{ ...input, id: created.id }, ...prev]);
    toast.success("Transaction added successfully");
  }

  function handleEditTransaction(updatedTransaction: Transaction) {
    setTransactions((prev) =>
      prev.map((transaction) =>
        transaction.id === updatedTransaction.id ? updatedTransaction : transaction
      )
    );
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

        <TransactionFilterBar value={filters} onValueChange={setFilters} onReset={resetFilters} />

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
