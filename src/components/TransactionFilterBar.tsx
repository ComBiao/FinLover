"use client";

import { Search, X } from "lucide-react";

import { CategorySelector } from "@/components/CategorySelector";
import { DateRangePicker } from "@/components/DateRangePicker";
import { TransactionTypeSelector } from "@/components/TransactionTypeSelector";
import { WalletSelector } from "@/components/WalletSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TransactionFilters } from "@/types/transaction";

type TransactionFilterBarProps = {
  value: TransactionFilters;
  onValueChange: (filters: TransactionFilters) => void;
  onReset: () => void;
  className?: string;
};

/**
 * Search/Reset row, plus a wrapping Type/Wallet/Category/DateRange filter
 * row below it — kept on its own row so Reset always sits next to Search
 * instead of trailing wherever the filter controls happen to wrap to.
 * Fully controlled — the caller owns filter state (a zustand store) and
 * passes it in via `value`/`onValueChange`, so this component stays a pure
 * presentational wrapper around the Issue #1 selectors.
 */
export function TransactionFilterBar({
  value,
  onValueChange,
  onReset,
  className,
}: TransactionFilterBarProps) {
  function patch(partial: Partial<TransactionFilters>) {
    onValueChange({ ...value, ...partial });
  }

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.search}
            onChange={(event) => patch({ search: event.target.value })}
            placeholder="Search by title or note"
            className="pl-8"
          />
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onReset} className="shrink-0">
          <X className="size-4" />
          <span className="hidden sm:inline">Reset Filters</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TransactionTypeSelector
          value={value.type}
          onValueChange={(type) => patch({ type })}
          className="min-w-[110px] flex-1 sm:max-w-40 sm:flex-none"
        />
        <WalletSelector
          value={value.walletId}
          onValueChange={(walletId) => patch({ walletId })}
          allowAll
          className="min-w-[110px] flex-1 sm:max-w-44 sm:flex-none"
        />
        <CategorySelector
          value={value.categoryId}
          onValueChange={(categoryId) => patch({ categoryId })}
          allowAll
          className="min-w-[110px] flex-1 sm:max-w-44 sm:flex-none"
        />
        <DateRangePicker
          value={value.dateRange}
          onValueChange={(dateRange) => patch({ dateRange })}
          className="w-full sm:ml-auto sm:w-auto"
        />
      </div>
    </div>
  );
}
