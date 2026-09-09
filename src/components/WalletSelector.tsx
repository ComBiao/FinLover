import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MOCK_WALLETS } from "@/lib/mockWallets";
import { cn } from "@/lib/utils";
import type { Wallet } from "@/types/wallet";

const ALL_VALUE = "all";

function formatBalance(balance: number) {
  return `฿${balance.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

type WalletSelectorProps = {
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

/**
 * Dropdown for picking a wallet/account. Pass `allowAll` to add a sentinel
 * "all" option for filter UIs, which is reported back to `onValueChange` as
 * `undefined`.
 */
export function WalletSelector({
  id,
  name,
  value = "",
  onValueChange,
  wallets = MOCK_WALLETS,
  placeholder = "Select a wallet",
  disabled,
  className,
  allowAll = false,
  allLabel = "All wallets",
}: WalletSelectorProps) {
  const selectValue = value || (allowAll ? ALL_VALUE : "");

  return (
    <Select
      name={name}
      value={selectValue}
      onValueChange={(newValue) => {
        if (!newValue) return;
        onValueChange?.(newValue === ALL_VALUE ? undefined : newValue);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder}>
          {(selectedId: string) => {
            if (selectedId === ALL_VALUE) return allLabel;
            const selected = wallets.find((wallet) => wallet.id === selectedId);
            if (!selected) return placeholder;
            const Icon = selected.icon;
            return (
              <>
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                {selected.name}
              </>
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allowAll ? <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem> : null}
        {wallets.map(({ id: walletId, name: walletName, balance, icon: Icon }) => (
          <SelectItem key={walletId} value={walletId}>
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">{walletName}</span>
            <span className="ml-2 text-xs text-muted-foreground">{formatBalance(balance)}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
