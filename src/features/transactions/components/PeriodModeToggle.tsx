"use client";

import { cn } from "@/lib/utils";
import type { PeriodMode } from "@/features/transactions/period";

const MODES: { mode: PeriodMode; label: string }[] = [
  { mode: "day", label: "Day" },
  { mode: "month", label: "Month" },
  { mode: "year", label: "Year" },
];

type PeriodModeToggleProps = {
  value: PeriodMode;
  onValueChange: (mode: PeriodMode) => void;
  className?: string;
};

/** Day | Month | Year segmented control for the Transactions period filter. */
export function PeriodModeToggle({ value, onValueChange, className }: PeriodModeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="View by"
      className={cn("flex items-center gap-1 rounded-xl bg-muted p-1", className)}
    >
      {MODES.map(({ mode, label }) => {
        const active = mode === value;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onValueChange(mode)}
            className={cn(
              "h-8 min-w-16 rounded-lg px-3.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary font-bold text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
