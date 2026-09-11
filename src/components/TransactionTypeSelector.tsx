import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TransactionType } from "@/types/category";

const ALL_VALUE = "all";

type TypeOption = {
  value: TransactionType;
  label: string;
  icon: LucideIcon;
  className: string;
};

/** Same semantic colors/icons as the Amount column in `TransactionTable`, so the filter reads as one system. */
const TYPE_OPTIONS: TypeOption[] = [
  { value: "income", label: "Income", icon: ArrowUpRight, className: "bg-success-bg text-success" },
  { value: "expense", label: "Expense", icon: ArrowDownRight, className: "bg-danger-bg text-destructive" },
];

type TransactionTypeSelectorProps = {
  id?: string;
  value?: TransactionType;
  onValueChange?: (type: TransactionType | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allLabel?: string;
};

/**
 * Dropdown for filtering transactions by type. Unlike `CategorySelector`/
 * `WalletSelector`, option values need no "option:" prefix — `income` and
 * `expense` are a fixed literal union, so they can never collide with the
 * `all` sentinel the way a data-driven category/wallet id theoretically could.
 */
export function TransactionTypeSelector({
  id,
  value,
  onValueChange,
  placeholder = "Select a type",
  disabled,
  className,
  allLabel = "All Types",
}: TransactionTypeSelectorProps) {
  const selectValue = value ?? ALL_VALUE;

  return (
    <Select
      value={selectValue}
      onValueChange={(newValue) => {
        if (!newValue) return;
        onValueChange?.(newValue === ALL_VALUE ? undefined : (newValue as TransactionType));
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder}>
          {(selectedValue: string) => {
            if (selectedValue === ALL_VALUE) return allLabel;
            const option = TYPE_OPTIONS.find((item) => item.value === selectedValue);
            if (!option) return placeholder;
            const Icon = option.icon;
            return (
              <Badge variant="outline" className={cn("gap-1 border-transparent", option.className)}>
                <Icon className="size-3" />
                {option.label}
              </Badge>
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem>
        {TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <SelectItem key={option.value} value={option.value}>
              <Badge variant="outline" className={cn("gap-1 border-transparent", option.className)}>
                <Icon className="size-3" />
                {option.label}
              </Badge>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
