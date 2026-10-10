"use client";

import * as React from "react";
import { QueryClientContext } from "@tanstack/react-query";

import { resolveChipTone, WALLET_TYPE_STYLES } from "@/components/chipColor";
import { ALL_VALUE, decodeOptionValue, encodeOptionValue } from "@/components/optionValue";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Wallet } from "@/types/wallet";
import { useWallets } from "@/features/wallets/hooks/useWallets";

function walletTone(wallet: Wallet) {
  return resolveChipTone(wallet.color, WALLET_TYPE_STYLES, wallet.type ?? wallet.id);
}

export type WalletSelectorProps = {
  id?: string;
  name?: string;
  value?: string;
  onValueChange?: (walletId: string | undefined) => void;
  wallets?: Wallet[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowAll?: boolean;
  allLabel?: string;
};

function WalletSelectorBase({
  id,
  name,
  value = "",
  onValueChange,
  wallets = [],
  placeholder = "Select a wallet",
  disabled,
  className,
  allowAll = false,
  allLabel = "All wallets",
}: WalletSelectorProps) {
  const selectValue = value ? encodeOptionValue(value) : allowAll ? ALL_VALUE : "";

  return (
    <Select
      name={name}
      value={selectValue}
      onValueChange={(newValue) => {
        if (!newValue) return;
        if (allowAll && newValue === ALL_VALUE) {
          onValueChange?.(undefined);
          return;
        }
        onValueChange?.(decodeOptionValue(newValue));
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder}>
          {(selectedValue: string) => {
            if (allowAll && selectedValue === ALL_VALUE) return allLabel;
            const selectedId = decodeOptionValue(selectedValue);
            const selected = wallets.find((wallet) => wallet.id === selectedId);
            if (!selected) return placeholder;
            const Icon = selected.icon;
            const tone = walletTone(selected);
            return (
              <Badge
                variant="secondary"
                className={cn("gap-1 border-transparent", tone.className)}
                style={tone.style}
              >
                <Icon className="size-3" />
                {selected.name}
              </Badge>
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allowAll ? <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem> : null}
        {wallets.map((wallet) => {
          const Icon = wallet.icon;
          const tone = walletTone(wallet);
          return (
            <SelectItem key={wallet.id} value={encodeOptionValue(wallet.id)}>
              <Badge
                variant="secondary"
                className={cn("gap-1 border-transparent", tone.className)}
                style={tone.style}
              >
                <Icon className="size-3" />
                {wallet.name}
              </Badge>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function WalletSelectorWithQuery(props: WalletSelectorProps) {
  const { data: wallets = [] } = useWallets();
  return <WalletSelectorBase {...props} wallets={props.wallets ?? wallets} />;
}

/**
 * Dropdown for picking a wallet/account.
 * Uses real wallets from useWallets() when inside QueryClientProvider.
 */
export function WalletSelector(props: WalletSelectorProps) {
  const hasQueryClient = Boolean(React.useContext(QueryClientContext));

  if (props.wallets !== undefined) {
    return <WalletSelectorBase {...props} />;
  }

  if (hasQueryClient) {
    return <WalletSelectorWithQuery {...props} />;
  }

  // Rendered outside QueryClientProvider (e.g. isolated tests) with no wallets supplied.
  return <WalletSelectorBase {...props} wallets={[]} />;
}
