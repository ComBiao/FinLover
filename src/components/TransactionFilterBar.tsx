"use client";

import { Search, X } from "lucide-react";

import { CategorySelector } from "@/components/CategorySelector";
import { DateRangePicker } from "@/components/DateRangePicker";
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
 * Search + Wallet/Category/DateRange filters for the Transactions list.
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
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:flex-wrap md:items-center",
        className
      )}
    >
      <div className="relative flex-1 md:min-w-[220px]">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value.search}
          onChange={(event) => patch({ search: event.target.value })}
          placeholder="Search by title or note"
          className="pl-8"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 md:flex md:w-auto md:flex-none">
        <WalletSelector
          value={value.walletId}
          onValueChange={(walletId) => patch({ walletId })}
          allowAll
          className="md:w-40"
        />
        <CategorySelector
          value={value.categoryId}
          onValueChange={(categoryId) => patch({ categoryId })}
          allowAll
          className="md:w-40"
        />
      </div>

      <DateRangePicker value={value.dateRange} onValueChange={(dateRange) => patch({ dateRange })} />

      <Button type="button" variant="ghost" size="sm" onClick={onReset} className="md:ml-auto">
        <X className="size-4" />
        Reset Filters
      </Button>
    </div>
  );
}
