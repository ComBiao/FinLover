"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { DeleteTransactionDialog } from "@/components/DeleteTransactionDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MOCK_CATEGORIES } from "@/lib/mockCategories";
import { MOCK_WALLETS } from "@/lib/mockWallets";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function formatAmount(amount: number, type: Transaction["type"]) {
  const formatted = `฿${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return type === "income" ? `+${formatted}` : `-${formatted}`;
}

type TransactionTableProps = {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  className?: string;
};

/**
 * Detailed row-per-transaction table with Category/Wallet badges and
 * Edit/Delete actions. Which row is pending deletion is kept as local state
 * (it's ephemeral UI state scoped to this table, not shared elsewhere) —
 * confirming actually removes it via the caller-supplied `onDelete`.
 */
export function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  className,
}: TransactionTableProps) {
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  if (transactions.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-card py-16 text-center",
          className
        )}
      >
        <p className="text-sm font-semibold text-foreground">No transactions found</p>
        <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[12%]">Date</TableHead>
            <TableHead className="w-[22%]">Title</TableHead>
            <TableHead className="w-[14%]">Category</TableHead>
            <TableHead className="w-[14%]">Wallet</TableHead>
            <TableHead className="w-[20%]">Note</TableHead>
            <TableHead className="w-[10%] text-right">Amount</TableHead>
            <TableHead className="w-[8%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            const category = MOCK_CATEGORIES.find(({ id }) => id === transaction.categoryId);
            const wallet = MOCK_WALLETS.find(({ id }) => id === transaction.walletId);
            const CategoryIcon = category?.icon;

            return (
              <TableRow key={transaction.id}>
                <TableCell className="text-muted-foreground">
                  {formatDate(transaction.date)}
                </TableCell>
                <TableCell className="truncate font-medium text-foreground">
                  {transaction.title}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {CategoryIcon ? <CategoryIcon className="size-3" /> : null}
                    {category?.name ?? "Uncategorized"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{wallet?.name ?? "Unknown wallet"}</Badge>
                </TableCell>
                <TableCell className="truncate text-muted-foreground">
                  {transaction.note ?? "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-semibold",
                    transaction.type === "income" ? "text-success" : "text-destructive"
                  )}
                >
                  {formatAmount(transaction.amount, transaction.type)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Edit transaction"
                      onClick={() => onEdit?.(transaction)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete transaction"
                      onClick={() => setPendingDelete(transaction)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <DeleteTransactionDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        transactionTitle={pendingDelete?.title}
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete);
        }}
      />
    </div>
  );
}
