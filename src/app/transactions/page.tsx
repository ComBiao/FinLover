"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { AddTransactionModal } from "@/components/AddTransactionModal";
import { TransactionFilterBar } from "@/components/TransactionFilterBar";
import { TransactionTable } from "@/components/TransactionTable";
import { Button } from "@/components/ui/button";
import { MOCK_TRANSACTIONS } from "@/lib/mockTransactions";
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

  const filteredTransactions = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return transactions
      .filter((transaction) => {
        if (filters.type && transaction.type !== filters.type) return false;
        if (filters.walletId && transaction.walletId !== filters.walletId) return false;
        if (filters.categoryId && transaction.categoryId !== filters.categoryId) return false;
        if (filters.dateRange?.from && transaction.date < filters.dateRange.from) return false;
        if (filters.dateRange?.to && transaction.date > filters.dateRange.to) return false;

        if (query) {
          const matchesTitle = transaction.title.toLowerCase().includes(query);
          const matchesNote = transaction.note?.toLowerCase().includes(query) ?? false;
          if (!matchesTitle && !matchesNote) return false;
        }

        return true;
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions, filters]);

  function handleDelete(transaction: Transaction) {
    setTransactions((prev) => prev.filter((item) => item.id !== transaction.id));
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

        <TransactionTable transactions={filteredTransactions} onDelete={handleDelete} />
      </div>

      <AddTransactionModal />
    </main>
  );
}
