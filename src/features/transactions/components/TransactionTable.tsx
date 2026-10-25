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
import { CATEGORY_STYLES, resolveChipTone, WALLET_TYPE_STYLES } from "@/components/chipColor";
import { FALLBACK_CATEGORY_NAME, isFallbackCategory } from "@/features/categories/categoriesService";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useWallets } from "@/features/wallets/hooks/useWallets";
import { MemberAvatar } from "@/features/wallets/shared/MemberAvatar";
import { cn, formatBaht, formatEnglishDate } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

function formatAmount(amount: number, type: Transaction["type"]) {
  return `${type === "income" ? "+" : "-"}${formatBaht(amount)}`;
}

/** Shared wallets: "Logged by Guy", plus "edited by Tul" when someone else changed the row. */
function LoggedBy({ transaction }: { transaction: Transaction }) {
  const { createdBy, editedBy } = transaction;
  if (!createdBy) return null;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <MemberAvatar id={createdBy.id} name={createdBy.name} size="sm" />
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm text-foreground">
          Logged by {createdBy.name}
          {createdBy.isYou ? " (you)" : ""}
        </span>
        {editedBy ? (
          <span className="truncate text-xs text-muted-foreground">
            edited by {editedBy.name}
            {editedBy.isYou ? " (you)" : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}

type TransactionTableProps = {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onDeleteRequest: (transaction: Transaction) => void;
  className?: string;
};

/**
 * Detailed row-per-transaction table with Category/Wallet badges and
 * Edit/Delete actions. Picking "Delete" just reports the row up via
 * `onDeleteRequest` — the confirmation dialog and the actual removal live at
 * the page level (via the shared `useTransactionModal` store) so the Edit
 * modal can trigger the same delete flow too.
 */
export function TransactionTable({
  transactions,
  onEdit,
  onDeleteRequest,
  className,
}: TransactionTableProps) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const { data: categories = [] } = useCategories();
  const { data: wallets = [] } = useWallets();
  // Rows of one shared wallet (Home with that wallet selected) trade the Category and
  // Wallet columns for "Logged by": shared wallets have no categories.
  const isSharedView = transactions.length > 0 && transactions.every((transaction) => transaction.createdBy);

  /** A row without a category shows its type's seeded "Others" (see `withFallbackCategory`). */
  const categoryOf = (transaction: Transaction) =>
    categories.find(({ id }) => id === transaction.categoryId) ??
    (transaction.categoryId
      ? undefined
      : categories.find((category) => category.type === transaction.type && isFallbackCategory(category)));

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
          const category = categoryOf(transaction);
          const wallet = wallets.find(({ id }) => id === transaction.walletId);
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
                  <p className="text-xs text-muted-foreground">{formatEnglishDate(transaction.date)}</p>
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

              {isSharedView ? (
                <LoggedBy transaction={transaction} />
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={
                      categoryTone
                        ? cn("border-transparent", categoryTone.className)
                        : "border-border bg-muted text-muted-foreground"
                    }
                    style={categoryTone?.style}
                  >
                    {CategoryIcon ? <CategoryIcon className="size-3" /> : null}
                    {category?.name ?? FALLBACK_CATEGORY_NAME}
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
              )}

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
                      onClick={() => onDeleteRequest(transaction)}
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
            <TableHead className={cn("py-3.5", isSharedView ? "w-[12%]" : "w-[10%]")}>Date</TableHead>
            <TableHead className={cn("py-3.5", isSharedView ? "w-[26%]" : "w-[24%]")}>Title</TableHead>
            {isSharedView ? (
              <TableHead className="w-[26%] py-3.5">Logged by</TableHead>
            ) : (
              <>
                <TableHead className="w-[15%] py-3.5">Category</TableHead>
                <TableHead className="w-[15%] py-3.5">Wallet</TableHead>
              </>
            )}
            <TableHead className={cn("py-3.5", isSharedView ? "w-[20%]" : "w-[22%]")}>Note</TableHead>
            <TableHead className="w-[10%] py-3.5 text-right">Amount</TableHead>
            <TableHead className="w-[4%] py-3.5 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            const category = categoryOf(transaction);
            const wallet = wallets.find(({ id }) => id === transaction.walletId);
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
                  {formatEnglishDate(transaction.date)}
                </TableCell>
                <TableCell className="truncate py-3.5 font-medium text-foreground">
                  {transaction.title}
                </TableCell>
                {isSharedView ? (
                  <TableCell className="py-3.5">
                    <LoggedBy transaction={transaction} />
                  </TableCell>
                ) : (
                  <>
                    <TableCell className="py-3.5">
                      <Badge
                        variant="outline"
                        className={
                          categoryTone
                            ? cn("border-transparent", categoryTone.className)
                            : "border-border bg-muted text-muted-foreground"
                        }
                        style={categoryTone?.style}
                      >
                        {CategoryIcon ? <CategoryIcon className="size-3" /> : null}
                        {category?.name ?? FALLBACK_CATEGORY_NAME}
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
                  </>
                )}
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
                          onClick={() => onDeleteRequest(transaction)}
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
    </div>
  );
}
