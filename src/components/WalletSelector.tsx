import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resolveChipTone, WALLET_TYPE_STYLES } from "@/lib/chipColor";
import { MOCK_WALLETS } from "@/lib/mockWallets";
import { cn } from "@/lib/utils";
import type { Wallet } from "@/types/wallet";

function walletTone(wallet: Wallet) {
  return resolveChipTone(wallet.color, WALLET_TYPE_STYLES, wallet.type ?? wallet.id);
}

const ALL_VALUE = "all";
const OPTION_PREFIX = "option:";

function encodeOptionValue(id: string) {
  return `${OPTION_PREFIX}${id}`;
}

function decodeOptionValue(value: string) {
  return value.slice(OPTION_PREFIX.length);
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
 * `undefined`. Real option values are encoded with a prefix so a wallet
 * whose `id` happens to be "all" can never collide with the sentinel value.
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
