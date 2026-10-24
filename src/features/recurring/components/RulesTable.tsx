"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Check,
  Edit,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CATEGORY_STYLES, resolveChipTone, WALLET_TYPE_STYLES } from "@/components/chipColor";
import { FALLBACK_CATEGORY_NAME, isFallbackCategory } from "@/features/categories/categoriesService";
import { cn, formatBaht } from "@/lib/utils";
import type { Category } from "@/types/category";
import type { Wallet } from "@/types/wallet";
import {
  formatCadenceString,
  formatEndConditionSummary,
  formatShortDateWithAbbrMonth,
} from "../dateCadence";
import type { RecurringRule, RecurringRuleStatus } from "../types";

type RulesTableProps = {
  rules: RecurringRule[];
  wallets: Wallet[];
  categories: Category[];
  simulatedDate: string;
  onPause: (ruleId: string) => void;
  onResume: (ruleId: string) => void;
  onEdit: (rule: RecurringRule) => void;
  onDelete: (ruleId: string) => void;
  onOpenCreateModal: () => void;
};

export function RulesTable({
  rules,
  wallets,
  categories,
  simulatedDate,
  onPause,
  onResume,
  onEdit,
  onDelete,
  onOpenCreateModal,
}: RulesTableProps) {
  const [filterStatus, setFilterStatus] = useState<"all" | RecurringRuleStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState<RecurringRule | null>(null);

  // If there are zero rules in total, render the required empty state (US4-3)
  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-xs">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Calendar className="size-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">No recurring transactions found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Set up recurring bills, subscriptions, or automatic salary deposits to automate your finances.
          </p>
        </div>
        <Button onClick={onOpenCreateModal} className="mt-2 font-semibold">
          <Plus className="mr-1.5 size-4" />
          Create Recurring Transaction
        </Button>
      </div>
    );
  }

  const filteredRules = rules.filter((rule) => {
    if (filterStatus !== "all" && rule.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = rule.title.toLowerCase().includes(q);
      const matchNote = rule.note?.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchNote) return false;
    }
    return true;
  });

  const categoryOf = (rule: RecurringRule) =>
    categories.find(({ id }) => id === rule.categoryId) ??
    (rule.categoryId
      ? undefined
      : categories.find((c) => c.type === rule.type && isFallbackCategory(c)));

  const confirmDelete = () => {
    if (deleteCandidate) {
      onDelete(deleteCandidate.id);
      setDeleteCandidate(null);
    }
  };

  const counts = {
    all: rules.length,
    active: rules.filter((r) => r.status === "active").length,
    paused: rules.filter((r) => r.status === "paused").length,
    completed: rules.filter((r) => r.status === "completed").length,
  };

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Search & Status Filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant={filterStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("all")}
              className="h-9 px-3 text-sm font-medium"
            >
              All Rules ({counts.all})
            </Button>
            <Button
              type="button"
              variant={filterStatus === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("active")}
              className="h-9 px-3 text-sm font-medium"
            >
              <span className="mr-1.5 size-2 rounded-full bg-emerald-500 inline-block" />
              Active ({counts.active})
            </Button>
            <Button
              type="button"
              variant={filterStatus === "paused" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("paused")}
              className="h-9 px-3 text-sm font-medium"
            >
              <span className="mr-1.5 size-2 rounded-full bg-amber-500 inline-block" />
              Paused ({counts.paused})
            </Button>
            <Button
              type="button"
              variant={filterStatus === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("completed")}
              className="h-9 px-3 text-sm font-medium"
            >
              <span className="mr-1.5 size-2 rounded-full bg-blue-500 inline-block" />
              Completed ({counts.completed})
            </Button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>
        </div>

        {/* Rules Table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          {filteredRules.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-foreground">No recurring transactions found matching filters</p>
              <p className="text-xs text-muted-foreground mt-0.5">Try clearing your search query or selecting &quot;All Rules&quot;.</p>
            </div>
          ) : (
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="text-sm">
                  <TableHead className="w-[9%] py-3.5">Status</TableHead>
                  <TableHead className="w-[21%] py-3.5">Title & Category</TableHead>
                  <TableHead className="w-[11%] py-3.5">Target Wallet</TableHead>
                  <TableHead className="w-[15%] py-3.5">Cadence</TableHead>
                  <TableHead className="w-[11%] py-3.5 whitespace-nowrap">Next Run Date</TableHead>
                  <TableHead className="w-[12%] py-3.5">End Condition</TableHead>
                  <TableHead className="w-[13%] py-3.5 text-right whitespace-nowrap">Amount</TableHead>
                  <TableHead className="w-[8%] py-3.5 text-right whitespace-nowrap">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => {
                  const category = categoryOf(rule);
                  const wallet = wallets.find(({ id }) => id === rule.walletId);
                  const CategoryIcon = category?.icon;
                  const WalletIcon = wallet?.icon;
                  const categoryTone = category
                    ? resolveChipTone(category.color, CATEGORY_STYLES, category.id)
                    : undefined;
                  const walletTone = wallet
                    ? resolveChipTone(wallet.color, WALLET_TYPE_STYLES, wallet.type ?? wallet.id)
                    : undefined;

                  const isDue = rule.status === "active" && rule.nextRunDate <= simulatedDate;
                  const cadence = formatCadenceString(rule);
                  const endSummary = formatEndConditionSummary(rule);

                  return (
                    <TableRow
                      key={rule.id}
                      className={cn(
                        "transition-colors text-sm",
                        rule.status === "completed" && "opacity-75"
                      )}
                    >
                      {/* Status Badge */}
                      <TableCell className="py-3.5">
                        {rule.status === "active" && (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center gap-1.5 w-fit"
                          >
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </Badge>
                        )}
                        {rule.status === "paused" && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold text-xs flex items-center gap-1.5 w-fit"
                          >
                            <Pause className="size-2.5" />
                            Paused
                          </Badge>
                        )}
                        {rule.status === "completed" && (
                          <Badge
                            variant="outline"
                            className="border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center gap-1 w-fit"
                          >
                            <Check className="size-2.5" />
                            Completed
                          </Badge>
                        )}
                      </TableCell>

                      {/* Rule Title & Category */}
                      <TableCell className="py-3.5">
                        <div className="flex flex-col gap-1 truncate">
                          <span className="font-semibold text-foreground text-sm truncate">{rule.title}</span>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={
                                categoryTone
                                  ? cn("border-transparent text-xs py-0.5", categoryTone.className)
                                  : "border-border bg-muted text-muted-foreground text-xs py-0.5"
                              }
                              style={categoryTone?.style}
                            >
                              {CategoryIcon ? <CategoryIcon className="size-3 mr-1" /> : null}
                              {category?.name ?? FALLBACK_CATEGORY_NAME}
                            </Badge>
                          </div>

                          {rule.note && (
                            <p className="text-xs text-muted-foreground italic truncate">
                              {rule.note}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Target Wallet */}
                      <TableCell className="py-3.5">
                        <Badge
                          variant="secondary"
                          className={cn("border-transparent text-xs py-0.5", walletTone?.className)}
                          style={walletTone?.style}
                        >
                          {WalletIcon ? <WalletIcon className="size-3 mr-1" /> : null}
                          {wallet?.name ?? "Main Bank"}
                        </Badge>
                      </TableCell>

                      {/* Cadence */}
                      <TableCell className="py-3.5">
                        <div className="flex flex-col truncate">
                          <span className="font-medium text-foreground text-sm truncate">{cadence}</span>
                          <span className="text-xs text-muted-foreground">
                            Starts {formatShortDateWithAbbrMonth(rule.startDate)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Next Scheduled Posting Date */}
                      <TableCell className="py-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className={cn("font-mono text-sm whitespace-nowrap", isDue ? "font-bold text-primary" : "text-foreground")}>
                            {formatShortDateWithAbbrMonth(rule.nextRunDate)}
                          </span>
                          {isDue && (
                            <span className="w-fit rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                              Due
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* End Condition Summary */}
                      <TableCell className="py-3.5">
                        <span className="text-sm font-normal text-muted-foreground whitespace-pre-line leading-snug block">
                          {endSummary}
                        </span>
                      </TableCell>

                      {/* Transaction Type & Amount */}
                      <TableCell className="py-3.5 text-right whitespace-nowrap">
                        <span
                          className={cn(
                            "font-bold text-base inline-flex items-center justify-end gap-0.5 whitespace-nowrap",
                            rule.type === "income" ? "text-success" : "text-destructive"
                          )}
                        >
                          {rule.type === "income" ? (
                            <ArrowUpRight className="size-4" />
                          ) : (
                            <ArrowDownRight className="size-4" />
                          )}
                          {`${rule.type === "income" ? "+" : "-"}${formatBaht(rule.amount)}`}
                        </span>
                      </TableCell>

                      {/* Quick-action Pause/Resume & Dropdown Actions */}
                      <TableCell className="py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 shrink-0">
                          {/* Quick-Action Pause / Resume Button (US4-4) */}
                          {rule.status === "active" ? (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => onPause(rule.id)}
                                    aria-label="Pause rule"
                                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                                  />
                                }
                              >
                                <Pause className="size-4" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">Pause schedule (halt future postings)</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : rule.status === "paused" ? (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => onResume(rule.id)}
                                    aria-label="Resume rule"
                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                  />
                                }
                              >
                                <Play className="size-4 fill-current" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="text-xs">
                                  <strong>Resume rule:</strong> Overdue cycles will be skipped without retroactive double-posting; advances to next upcoming cycle.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          ) : null}

                          {/* More dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="More actions"
                                  className="text-muted-foreground hover:text-foreground"
                                />
                              }
                            >
                              <MoreVertical className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-sm">
                              {rule.status !== "completed" && (
                                <DropdownMenuItem onClick={() => onEdit(rule)}>
                                  <Edit className="mr-2 size-4" />
                                  Edit Rule
                                </DropdownMenuItem>
                              )}

                              {rule.status !== "completed" && <DropdownMenuSeparator />}

                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteCandidate(rule)}
                              >
                                <Trash2 className="mr-2 size-4" />
                                Delete Rule
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
          )}
        </div>

        {/* US4-5 Delete confirmation dialog preserving past transactions */}
        <AlertDialog
          open={Boolean(deleteCandidate)}
          onOpenChange={(open) => !open && setDeleteCandidate(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Recurring Rule?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2.5 text-xs leading-relaxed">
                <span className="block font-medium text-foreground">
                  Are you sure you want to delete &quot;{deleteCandidate?.title}&quot;?
                </span>
                <span className="block rounded-lg border border-border bg-muted/60 p-3 text-muted-foreground">
                  Deleting this rule stops future occurrences. All past recorded transactions in your wallet ledger will be preserved.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
              >
                Halt & Delete Rule
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
