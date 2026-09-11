"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AddTransactionModal } from "@/components/AddTransactionModal";
import { DeleteTransactionDialog } from "@/components/DeleteTransactionDialog";
import { TransactionFilterBar } from "@/components/TransactionFilterBar";
import { TransactionTable } from "@/components/TransactionTable";
import { Button } from "@/components/ui/button";
import { MOCK_TRANSACTIONS } from "@/lib/mockTransactions";
import { filterTransactions } from "@/lib/transactions";
import { useTransactionFilters } from "@/store/useTransactionFilters";
import { useTransactionModal } from "@/store/useTransactionModal";
import type { Transaction } from "@/types/transaction";

import { SummaryCards } from "./_components/SummaryCards";

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
   * TODO: call DELETE /api/transactions/:id once the endpoint exists.
   */
  function handleDeleteTransaction(id: string) {
    setTransactions((prev) => prev.filter((transaction) => transaction.id !== id));
    toast.success("Transaction deleted successfully");
  }

  function handleAddTransaction(newTransaction: Transaction) {
    setTransactions((prev) => [newTransaction, ...prev]);
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
