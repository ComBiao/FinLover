"use client";

import { ChevronDown, Users, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type WalletOption = { id: string; name: string; isShared?: boolean };

type WalletMultiSelectProps = {
  wallets: WalletOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onSelectAll: () => void;
  /** Shown under the control and flags it invalid (for example "Select at least 1 wallet"). */
  error?: string;
  className?: string;
};

/**
 * The trigger text: "All wallets (3)", "All personal wallets (3)" (shared wallets exist but are not ticked),
 * the wallet's name, "Cash, Bank" or "Select wallets".
 */
export function walletSummaryLabel(wallets: WalletOption[], selectedIds: string[]) {
  if (wallets.length === 0) return "No wallets";
  if (selectedIds.length === 0) return "Select wallets";
  if (selectedIds.length === wallets.length) return `All wallets (${wallets.length})`;
  const personal = wallets.filter((wallet) => !wallet.isShared);
  const noSharedPicked = !wallets.some((wallet) => wallet.isShared && selectedIds.includes(wallet.id));
  if (personal.length > 0 && personal.length < wallets.length && noSharedPicked && personal.every((wallet) => selectedIds.includes(wallet.id))) {
    return `All personal wallets (${personal.length})`;
  }
  const names = wallets.filter((wallet) => selectedIds.includes(wallet.id)).map((wallet) => wallet.name);
  return names.length <= 2 ? names.join(", ") : `${names.length} wallets`;
}

/** Wallet filter (US8-1): a checkbox per wallet plus a Select all shortcut. */
export function WalletMultiSelect({
  wallets,
  selectedIds,
  onChange,
  onSelectAll,
  error,
  className,
}: WalletMultiSelectProps) {
  function toggle(id: string, checked: boolean) {
    const next = checked ? [...selectedIds, id] : selectedIds.filter((selectedId) => selectedId !== id);
    // keep the list in the same order as the wallet list so the applied filter is stable
    onChange(wallets.map((wallet) => wallet.id).filter((walletId) => next.includes(walletId)));
  }

  const allSelected = wallets.length > 0 && selectedIds.length === wallets.length;
  const personalWallets = wallets.filter((wallet) => !wallet.isShared);
  const sharedWallets = wallets.filter((wallet) => wallet.isShared);
  // The two groups only get headings once there is a shared wallet to tell apart.
  const groups = sharedWallets.length > 0
    ? [
        { title: "Personal", wallets: personalWallets, icon: false },
        { title: "Shared", wallets: sharedWallets, icon: true },
      ]
    : [{ title: null, wallets: personalWallets, icon: false }];

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              aria-label="Wallets"
              aria-invalid={error ? true : undefined}
              disabled={wallets.length === 0}
              className={cn("h-9 min-w-48 justify-between gap-2 rounded-xl", error && "border-destructive")}
            />
          }
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Wallet className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{walletSummaryLabel(wallets, selectedIds)}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Wallets</span>
            <Button type="button" variant="ghost" size="xs" onClick={onSelectAll} disabled={allSelected}>
              Select all
            </Button>
          </div>
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {groups.map((group) => (
              <section key={group.title ?? "all"} aria-label={group.title ?? undefined}>
                {group.title ? (
                  <h3 className="flex items-center gap-1.5 px-2 pt-1 pb-0.5 text-xs font-semibold text-muted-foreground">
                    {group.icon ? <Users className="size-3.5" aria-hidden="true" /> : null}
                    {group.title}
                  </h3>
                ) : null}
                <ul className="flex flex-col">
                  {group.wallets.map((wallet) => {
                    const checked = selectedIds.includes(wallet.id);
                    return (
                      <li key={wallet.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => toggle(wallet.id, value === true)}
                          />
                          <span className="truncate">{wallet.name}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
