import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MOCK_CATEGORIES } from "@/lib/mockCategories";
import { cn } from "@/lib/utils";
import type { Category, TransactionType } from "@/types/category";

const ALL_VALUE = "all";
const UNCATEGORIZED_VALUE = "uncategorized";
const OPTION_PREFIX = "option:";

function encodeOptionValue(id: string) {
  return `${OPTION_PREFIX}${id}`;
}

function decodeOptionValue(value: string) {
  return value.slice(OPTION_PREFIX.length);
}

type CategorySelectorProps = {
  id?: string;
  name?: string;
  type?: TransactionType;
  value?: string;
  onValueChange?: (categoryId: string | undefined) => void;
  categories?: Category[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowAll?: boolean;
  allLabel?: string;
  allowUncategorized?: boolean;
  uncategorizedLabel?: string;
};

/**
 * Dropdown for picking a category, optionally filtered by transaction type
 * (income/expense). Pass `allowAll` to add a sentinel "all" option for
 * filter UIs, or `allowUncategorized` to add a distinct "Uncategorized"
 * option for forms that record a transaction with no category — both are
 * reported back to `onValueChange` as `undefined`, but use separate
 * sentinel values so the two use cases never collide with each other.
 * Real option values are encoded with a prefix so a category whose `id`
 * happens to be "all" or "uncategorized" can never collide with either
 * sentinel value.
 */
export function CategorySelector({
  id,
  name,
  type,
  value = "",
  onValueChange,
  categories = MOCK_CATEGORIES,
  placeholder = "Select a category",
  disabled,
  className,
  allowAll = false,
  allLabel = "All categories",
  allowUncategorized = false,
  uncategorizedLabel = "Uncategorized",
}: CategorySelectorProps) {
  const options = type ? categories.filter((category) => category.type === type) : categories;
  const selectValue = value
    ? encodeOptionValue(value)
    : allowAll
      ? ALL_VALUE
      : allowUncategorized
        ? UNCATEGORIZED_VALUE
        : "";

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
        if (allowUncategorized && newValue === UNCATEGORIZED_VALUE) {
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
            if (allowUncategorized && selectedValue === UNCATEGORIZED_VALUE) {
              return uncategorizedLabel;
            }
            const selectedId = decodeOptionValue(selectedValue);
            const selected = options.find((option) => option.id === selectedId);
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
        {allowUncategorized ? (
          <SelectItem value={UNCATEGORIZED_VALUE}>{uncategorizedLabel}</SelectItem>
        ) : null}
        {options.map(({ id: categoryId, name: categoryName, icon: Icon }) => (
          <SelectItem key={categoryId} value={encodeOptionValue(categoryId)}>
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            {categoryName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
