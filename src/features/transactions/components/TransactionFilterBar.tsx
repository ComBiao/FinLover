"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

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
 * Below `sm`, only Search and a "Filters" toggle button show by default —
 * the rest of the controls (Type/Category/Wallet/DateRange/Reset) stay
 * collapsed underneath and only render once the toggle is opened, so the
 * screen isn't crowded before the user asks for it. The toggle button
 * carries a count badge whenever a filter is already active, so a collapsed
 * panel never hides that filtering is in effect. At `sm` and up this
 * collapses into the compact Search+Reset row followed by a wrapping filter
 * row, always expanded — kept as a separate, hidden/shown pair rather than
 * one responsive flex layout so Reset never has to jump position depending
 * on how the filter controls happen to wrap. Fully controlled — the caller
 * owns filter state (a zustand store) and passes it in via
 * `value`/`onValueChange`, so this component stays a pure presentational
 * wrapper around the Issue #1 selectors.
 */
export function TransactionFilterBar({
  value,
  onValueChange,
  onReset,
  className,
}: TransactionFilterBarProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  function patch(partial: Partial<TransactionFilters>) {
    onValueChange({ ...value, ...partial });
  }

  const activeFilterCount = [
    value.type,
    value.walletId,
    value.categoryId,
    value.dateRange?.from ?? value.dateRange?.to,
  ].filter(Boolean).length;

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex flex-col gap-2.5 sm:hidden">
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsFiltersOpen((prev) => !prev)}
            aria-expanded={isFiltersOpen}
            className="relative shrink-0 gap-1.5"
          >
            <SlidersHorizontal className="size-4" />
            Filters
            {activeFilterCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
        </div>

        {isFiltersOpen ? (
          <div className="flex flex-col gap-2.5">
            <TransactionTypeSelector
              value={value.type}
              onValueChange={(type) => patch({ type })}
              className="w-full"
            />
            <CategorySelector
              value={value.categoryId}
              onValueChange={(categoryId) => patch({ categoryId })}
              allowAll
              allowUncategorized
              className="w-full"
            />
            <WalletSelector
              value={value.walletId}
              onValueChange={(walletId) => patch({ walletId })}
              allowAll
              className="w-full"
            />
            <DateRangePicker
              value={value.dateRange}
              onValueChange={(dateRange) => patch({ dateRange })}
              className="w-full"
            />
            <Button type="button" variant="ghost" size="sm" onClick={onReset} className="w-full">
              <X className="size-4" />
              Reset Filters
            </Button>
          </div>
        ) : null}
      </div>

      <div className="hidden flex-col gap-3 sm:flex">
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
            Reset Filters
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TransactionTypeSelector
            value={value.type}
            onValueChange={(type) => patch({ type })}
            className="min-w-[110px] flex-1 sm:max-w-40 sm:flex-none"
          />
          <CategorySelector
            value={value.categoryId}
            onValueChange={(categoryId) => patch({ categoryId })}
            allowAll
            allowUncategorized
            className="min-w-[110px] flex-1 sm:max-w-44 sm:flex-none"
          />
          <WalletSelector
            value={value.walletId}
            onValueChange={(walletId) => patch({ walletId })}
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
    </div>
  );
}
