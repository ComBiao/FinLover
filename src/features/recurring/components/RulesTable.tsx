"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionPageState } from "@/hooks/useSessionPageState";
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
import { resolveCategoryIcon } from "@/features/categories/categoryIcons";
import { SHARED_CATEGORY_PRESETS, defaultSharedCategoryKey } from "@/shared/contracts";
import { cn, formatBaht, todayISODate } from "@/lib/utils";
import type { Category } from "@/types/category";
import type { Wallet } from "@/types/wallet";
import {
  formatCadenceString,
  formatEndConditionSummary,
  formatShortDateWithAbbrMonth,
} from "../dateCadence";
import type { RecurringRule, RecurringRuleStatus } from "../types";
const isStatus = (value: string): value is "all" | RecurringRuleStatus =>
  value === "all" || value === "active" || value === "paused" || value === "completed";
const isSearch = (value: string): value is string => typeof value === "string";

type RulesTableProps = {
  rules: RecurringRule[];
  wallets: Wallet[];
  categories: Category[];
  simulatedDate?: string;
  onPause: (ruleId: string) => void;
  onResume: (ruleId: string) => void;
  onEdit: (rule: RecurringRule) => void;
  onDelete: (ruleId: string) => void;
  onOpenCreateModal: () => void;
  pendingStatusId?: string | null;
};

export function RulesTable({
  rules,
  wallets,
  categories,
  simulatedDate = todayISODate(),
  onPause,
  onResume,
  onEdit,
  onDelete,
  onOpenCreateModal,
  pendingStatusId,
}: RulesTableProps) {
  const [filterStatus, setFilterStatus, statusRestored] = useSessionPageState("recurringStatus", "all" as "all" | RecurringRuleStatus, isStatus);
  const [searchQuery, setSearchQuery, searchRestored] = useSessionPageState("recurringSearch", "", isSearch);
  const [deleteCandidate, setDeleteCandidate] = useState<RecurringRule | null>(null);

  if (!statusRestored || !searchRestored) {
    return <div className="flex flex-col gap-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>;
  }

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

  const categoryOf = (rule: RecurringRule) => {
    if (rule.categoryKey) {
      const preset =
        SHARED_CATEGORY_PRESETS.find((p) => p.key === rule.categoryKey) ??
        SHARED_CATEGORY_PRESETS.find((p) => p.key === defaultSharedCategoryKey(rule.type));
      if (preset) {
        return {
          id: preset.key,
          name: preset.name,
          color: preset.color,
          icon: resolveCategoryIcon(preset.icon),
          type: preset.type,
          isSystem: true,
        };
      }
    }
    return (
      categories.find(({ id }) => id === rule.categoryId) ??
      (rule.categoryId
        ? undefined
        : categories.find((c) => c.type === rule.type && isFallbackCategory(c)))
    );
  };

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

  /** Everything a rule needs to show itself, shared by the table row and the phone card. */
  const ruleView = (rule: RecurringRule) => {
    const category = categoryOf(rule);
    const wallet = wallets.find(({ id }) => id === rule.walletId);
    // Gone from the list (e.g. the Creator left the shared wallet), so do not pass it off as another wallet.
    const walletName = wallet?.name ?? "Unavailable wallet";
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

    return { category, walletName, CategoryIcon, WalletIcon, categoryTone, walletTone, isDue, cadence, endSummary };
  };

  const renderStatusBadge = (rule: RecurringRule) => (
    <>
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
    </>
  );

  const renderActions = (rule: RecurringRule) => (
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
                disabled={pendingStatusId === rule.id}
                aria-label="Pause rule"
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 disabled:opacity-50 max-md:size-10"
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
                disabled={pendingStatusId === rule.id}
                aria-label="Resume rule"
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-50 max-md:size-10"
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
              className="text-muted-foreground hover:text-foreground max-md:size-10"
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
  );

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

        {/* Phones: one card per rule instead of the 8-column table */}
        {filteredRules.length > 0 ? (
          <ul className="flex flex-col gap-3 md:hidden" aria-label="Recurring rules">
            {filteredRules.map((rule) => {
              const { category, walletName, CategoryIcon, WalletIcon, categoryTone, walletTone, isDue, cadence, endSummary } =
                ruleView(rule);

              return (
                <li
                  key={rule.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm",
                    rule.status === "completed" && "opacity-75"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-[15px] font-semibold text-foreground">{rule.title}</span>
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
                        <Badge
                          variant="secondary"
                          className={cn("border-transparent text-xs py-0.5", walletTone?.className)}
                          style={walletTone?.style}
                          aria-label={`Target: ${walletName}`}
                          title={`Target: ${walletName}`}
                        >
                          {WalletIcon ? <WalletIcon className="size-3 mr-1" /> : null}
                          {walletName}
                        </Badge>
                      </div>
                    </div>
                    <div className="shrink-0">{renderStatusBadge(rule)}</div>
                  </div>

                  {rule.note ? <p className="text-xs italic text-muted-foreground">{rule.note}</p> : null}

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Cadence</dt>
                      <dd className="text-sm font-medium text-foreground">{cadence}</dd>
                      <dd className="text-muted-foreground">Starts {formatShortDateWithAbbrMonth(rule.startDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Next run</dt>
                      <dd
                        className={cn(
                          "font-mono text-sm",
                          rule.status === "paused"
                            ? "text-muted-foreground opacity-60"
                            : isDue
                            ? "font-bold text-primary"
                            : "text-foreground"
                        )}
                      >
                        {formatShortDateWithAbbrMonth(rule.nextRunDate)}
                        {isDue ? (
                          <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 font-sans text-xs font-bold text-primary">
                            Due
                          </span>
                        ) : null}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Ends</dt>
                      <dd className="whitespace-pre-line text-sm text-foreground">{endSummary}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Amount</dt>
                      <dd
                        className={cn(
                          "inline-flex items-center gap-0.5 text-base font-bold",
                          rule.type === "income" ? "text-success" : "text-destructive"
                        )}
                      >
                        {rule.type === "income" ? (
                          <ArrowUpRight className="size-4" />
                        ) : (
                          <ArrowDownRight className="size-4" />
                        )}
                        {`${rule.type === "income" ? "+" : "-"}${formatBaht(rule.amount)}`}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex justify-end border-t border-border pt-2">{renderActions(rule)}</div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {/* Rules Table (md and up; on phones it only shows the "nothing matches" message) */}
        <div
          className={cn(
            "overflow-x-auto rounded-xl border border-border bg-card shadow-sm",
            filteredRules.length > 0 && "max-md:hidden"
          )}
        >
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
                  const { category, walletName, CategoryIcon, WalletIcon, categoryTone, walletTone, isDue, cadence, endSummary } = ruleView(rule);

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
                        {renderStatusBadge(rule)}
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
                          aria-label={`Target: ${walletName}`}
                          title={`Target: ${walletName}`}
                        >
                          {WalletIcon ? <WalletIcon className="size-3 mr-1" /> : null}
                          {walletName}
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
                          <span
                            className={cn(
                              "font-mono text-sm whitespace-nowrap",
                              rule.status === "paused"
                                ? "text-muted-foreground opacity-60"
                                : isDue
                                ? "font-bold text-primary"
                                : "text-foreground"
                            )}
                          >
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
                        {renderActions(rule)}
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
                  This will stop all future recurring transactions for this rule. All past recorded transactions in your wallet ledger will be preserved.
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
