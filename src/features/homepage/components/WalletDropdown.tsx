"use client";

import * as React from "react";
import { Check, ChevronDown, Wallet as WalletIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { hexToRgba, shadeHex } from "@/components/chipColor";
import { formatCurrency as formatWalletBalance } from "@/features/homepage/components/HomeCards";
import { cn } from "@/lib/utils";
import type { Wallet } from "@/types/wallet";

type WalletDropdownProps = {
  wallets: Wallet[];
  /** A wallet id, or "all" for the combined view. */
  value: string;
  onValueChange: (next: string) => void;
  className?: string;
};

const ALL_WALLETS_COLOR = "#4A4757";

function walletTypeLabel(wallet: Wallet) {
  if (wallet.isSaving) return wallet.savingGoal ? `Saving wallet · goal ${formatWalletBalance(wallet.savingGoal)}` : "Saving wallet";
  return "Daily wallet";
}

/**
 * Dropdown for scoping Home's cards/table to "All wallets" or one specific
 * wallet. The trigger and each option are tinted with the wallet's own
 * color — a solid icon square, a soft-tint background, and a colored ring
 * on the selected option — matching the design's wallet-selector look.
 */
export function WalletDropdown({ wallets, value, onValueChange, className }: WalletDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const selectedWallet = wallets.find((wallet) => wallet.id === value);
  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  const selectedColor = selectedWallet?.color ?? ALL_WALLETS_COLOR;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-haspopup="listbox"
            className={cn("h-[54px] min-w-[240px] justify-between gap-2.5 border-2 px-2 pr-3.5", className)}
            style={{
              borderColor: hexToRgba(selectedColor, 0.55),
              backgroundColor: hexToRgba(selectedColor, 0.12),
            }}
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] text-white"
            style={{ backgroundColor: selectedColor }}
          >
            <WalletIcon className="size-5" />
          </span>
          <span className="flex min-w-0 flex-col items-start gap-0.5">
            <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              Wallet
            </span>
            <span className="truncate text-base font-bold" style={{ color: shadeHex(selectedColor, 0.6) }}>
              {selectedWallet ? selectedWallet.name : "All wallets"}
            </span>
          </span>
        </span>
        <ChevronDown className="size-4.5 shrink-0 text-foreground/70" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-2">
        <button
          type="button"
          role="option"
          aria-selected={value === "all"}
          onClick={() => {
            onValueChange("all");
            setOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-xl border-2 p-2.5 text-left transition-colors"
          style={{
            borderColor: value === "all" ? ALL_WALLETS_COLOR : "transparent",
            backgroundColor: value === "all" ? "var(--muted)" : "transparent",
          }}
        >
          <span
            className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] text-white"
            style={{ backgroundColor: ALL_WALLETS_COLOR }}
          >
            <WalletIcon className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-bold text-foreground">All wallets</span>
            <span className="block text-xs text-muted-foreground">Combined view</span>
          </span>
          <span className="text-sm font-bold text-foreground">{formatWalletBalance(totalBalance)}</span>
          <span className="flex w-5 shrink-0 justify-center">
            {value === "all" ? <Check className="size-4.5" strokeWidth={2.6} /> : null}
          </span>
        </button>

        {wallets.map((wallet) => {
          const isSelected = value === wallet.id;
          const color = wallet.color ?? ALL_WALLETS_COLOR;
          const textColor = shadeHex(color, 0.6);

          return (
            <button
              key={wallet.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => {
                onValueChange(wallet.id);
                setOpen(false);
              }}
              className="mt-1 flex w-full items-center gap-3 rounded-xl border-2 p-2.5 text-left transition-colors"
              style={{
                borderColor: isSelected ? hexToRgba(color, 0.7) : "transparent",
                backgroundColor: isSelected ? hexToRgba(color, 0.14) : "transparent",
              }}
            >
              <span
                className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] text-white"
                style={{ backgroundColor: color }}
              >
                <wallet.icon className="size-5" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold" style={{ color: textColor }}>
                  {wallet.name}
                </span>
                <span className="block text-xs text-muted-foreground">{walletTypeLabel(wallet)}</span>
              </span>
              <span className="text-sm font-bold text-foreground">
                {formatWalletBalance(wallet.balance)}
              </span>
              <span className="flex w-5 shrink-0 justify-center" style={{ color: textColor }}>
                {isSelected ? <Check className="size-4.5" strokeWidth={2.6} /> : null}
              </span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
