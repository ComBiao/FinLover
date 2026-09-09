"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

import { DeleteTransactionDialog } from "@/components/DeleteTransactionDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CATEGORY_STYLES, resolveChipTone, WALLET_TYPE_STYLES } from "@/lib/chipColor";
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
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

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
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="divide-y divide-border md:hidden">
        {transactions.map((transaction) => {
          const category = MOCK_CATEGORIES.find(({ id }) => id === transaction.categoryId);
          const wallet = MOCK_WALLETS.find(({ id }) => id === transaction.walletId);
          const CategoryIcon = category?.icon;
          const WalletIcon = wallet?.icon;
          const categoryTone = category
            ? resolveChipTone(category.color, CATEGORY_STYLES, category.id)
            : undefined;
          const walletTone = wallet
            ? resolveChipTone(wallet.color, WALLET_TYPE_STYLES, wallet.type ?? wallet.id)
            : undefined;

          return (
            <div key={transaction.id} className="flex flex-col gap-2 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{transaction.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 font-semibold",
                    transaction.type === "income" ? "text-success" : "text-destructive"
                  )}
                >
                  {transaction.type === "income" ? (
                    <ArrowUpRight className="size-3.5" />
                  ) : (
                    <ArrowDownRight className="size-3.5" />
                  )}
                  {formatAmount(transaction.amount, transaction.type)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn("border-transparent", categoryTone?.className)}
                  style={categoryTone?.style}
                >
                  {CategoryIcon ? <CategoryIcon className="size-3" /> : null}
                  {category?.name ?? "Uncategorized"}
                </Badge>
                <Badge
                  variant="secondary"
                  className={cn("border-transparent", walletTone?.className)}
                  style={walletTone?.style}
                >
                  {WalletIcon ? <WalletIcon className="size-3" /> : null}
                  {wallet?.name ?? "Unknown wallet"}
                </Badge>
              </div>

              {transaction.note ? (
                <p className="text-sm break-words text-muted-foreground">{transaction.note}</p>
              ) : null}

              <div className="flex justify-end pt-1">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Transaction actions"
                        className="text-muted-foreground hover:text-foreground"
                      />
                    }
                  >
                    <MoreVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(transaction)}>
                      <Pencil className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setPendingDelete(transaction)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      <Table className="hidden table-fixed md:table">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[10%] py-3.5">Date</TableHead>
            <TableHead className="w-[24%] py-3.5">Title</TableHead>
            <TableHead className="w-[15%] py-3.5">Category</TableHead>
            <TableHead className="w-[15%] py-3.5">Wallet</TableHead>
            <TableHead className="w-[22%] py-3.5">Note</TableHead>
            <TableHead className="w-[10%] py-3.5 text-right">Amount</TableHead>
            <TableHead className="w-[4%] py-3.5 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            const category = MOCK_CATEGORIES.find(({ id }) => id === transaction.categoryId);
            const wallet = MOCK_WALLETS.find(({ id }) => id === transaction.walletId);
            const CategoryIcon = category?.icon;
            const WalletIcon = wallet?.icon;
            const isExpanded = expandedRowId === transaction.id;
            const categoryTone = category
              ? resolveChipTone(category.color, CATEGORY_STYLES, category.id)
              : undefined;
            const walletTone = wallet
              ? resolveChipTone(wallet.color, WALLET_TYPE_STYLES, wallet.type ?? wallet.id)
              : undefined;

            return (
              <TableRow
                key={transaction.id}
                className={cn(
                  "transition-colors",
                  isExpanded && "bg-primary/5 hover:bg-primary/5"
                )}
              >
                <TableCell className="py-3.5 text-muted-foreground">
                  {formatDate(transaction.date)}
                </TableCell>
                <TableCell className="truncate py-3.5 font-medium text-foreground">
                  {transaction.title}
                </TableCell>
                <TableCell className="py-3.5">
                  <Badge
                    variant="outline"
                    className={cn("border-transparent", categoryTone?.className)}
                    style={categoryTone?.style}
                  >
                    {CategoryIcon ? <CategoryIcon className="size-3" /> : null}
                    {category?.name ?? "Uncategorized"}
                  </Badge>
                </TableCell>
                <TableCell className="py-3.5">
                  <Badge
                    variant="secondary"
                    className={cn("border-transparent", walletTone?.className)}
                    style={walletTone?.style}
                  >
                    {WalletIcon ? <WalletIcon className="size-3" /> : null}
                    {wallet?.name ?? "Unknown wallet"}
                  </Badge>
                </TableCell>
                <TableCell className="py-3.5 text-muted-foreground">
                  {transaction.note ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedRowId((current) =>
                          current === transaction.id ? null : transaction.id
                        )
                      }
                      className="group/note flex w-full items-start gap-1 text-left transition-colors hover:text-foreground"
                    >
                      <span
                        className={cn(
                          "min-w-0 flex-1",
                          isExpanded ? "whitespace-pre-wrap break-words" : "truncate"
                        )}
                      >
                        {transaction.note}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      ) : (
                        <ChevronDown className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/70 transition-colors group-hover/note:text-foreground" />
                      )}
                    </button>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    "py-3.5 text-right font-semibold",
                    transaction.type === "income" ? "text-success" : "text-destructive"
                  )}
                >
                  <span className="inline-flex items-center justify-end gap-1">
                    {transaction.type === "income" ? (
                      <ArrowUpRight className="size-3.5" />
                    ) : (
                      <ArrowDownRight className="size-3.5" />
                    )}
                    {formatAmount(transaction.amount, transaction.type)}
                  </span>
                </TableCell>
                <TableCell className="py-3.5">
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Transaction actions"
                            className="text-muted-foreground hover:text-foreground"
                          />
                        }
                      >
                        <MoreVertical className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit?.(transaction)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setPendingDelete(transaction)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
