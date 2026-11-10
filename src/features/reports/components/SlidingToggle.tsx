"use client";

import { Tabs, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type SlidingToggleOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
  /** Shown on hover, e.g. why an option is disabled. */
  title?: string;
};

type SlidingToggleProps<T extends string> = {
  value: T | undefined;
  onValueChange: (value: T) => void;
  options: SlidingToggleOption<T>[];
  "aria-label": string;
};

/**
 * A pill of options where the chosen one is filled in the brand green and the fill slides to the next
 * choice (the `TabsIndicator`, the same effect as the Personal / Shared switch on the wallets page).
 * It is 36px high (1px border + 3px padding + the 28px segments) like the other filter controls.
 */
export function SlidingToggle<T extends string>({
  value,
  onValueChange,
  options,
  "aria-label": ariaLabel,
}: SlidingToggleProps<T>) {
  return (
    <Tabs value={value ?? null} onValueChange={(next) => onValueChange(next as T)} className="w-fit gap-0">
      <TabsList
        aria-label={ariaLabel}
        className="relative h-9 w-fit rounded-xl border border-border bg-card p-[3px] group-data-horizontal/tabs:h-9"
      >
        <TabsIndicator className="rounded-lg bg-primary shadow-sm" />
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            title={option.title}
            className="h-7 rounded-lg px-3 font-medium text-muted-foreground transition-colors hover:text-foreground data-active:bg-transparent data-active:text-primary-foreground data-active:shadow-none aria-disabled:pointer-events-auto aria-disabled:cursor-not-allowed dark:data-active:border-transparent dark:data-active:bg-transparent dark:data-active:text-primary-foreground"
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
