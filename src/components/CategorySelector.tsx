import { CATEGORY_STYLES, resolveChipTone } from "@/components/chipColor";
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
import type { Category, TransactionType } from "@/types/category";
import { MOCK_CATEGORIES } from "@/mocks/mockCategories";

function categoryTone(category: Category) {
  return resolveChipTone(category.color, CATEGORY_STYLES, category.id);
}

/** Reported to `onValueChange` when the "Uncategorized" option is picked — distinct from `undefined` (which `allowAll`'s "All categories" reports) so callers filtering a list can tell "no filter" apart from "only uncategorized rows". */
export const UNCATEGORIZED_VALUE = "uncategorized";

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
 * (income/expense). Pass `allowAll` to add an "All categories" option for
 * filter UIs (reported back to `onValueChange` as `undefined`, meaning "no
 * filter"), or `allowUncategorized` to add a distinct "Uncategorized" option
 * — for a form recording a transaction with no category, or for a filter
 * that should show only uncategorized rows (reported back as the exported
 * `UNCATEGORIZED_VALUE` sentinel, distinct from `undefined` so it never
 * collides with "no filter" when both options are shown together). Real
 * option values are encoded with a prefix so a category whose `id` happens
 * to be "all" or "uncategorized" can never collide with either sentinel
 * value.
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
  const uncategorizedBadge = (
    <Badge variant="outline" className="gap-1 border-border bg-muted text-muted-foreground">
      {uncategorizedLabel}
    </Badge>
  );
  const selectValue = !value
    ? allowAll
      ? ALL_VALUE
      : allowUncategorized
        ? UNCATEGORIZED_VALUE
        : ""
    : value === UNCATEGORIZED_VALUE
      ? UNCATEGORIZED_VALUE
      : encodeOptionValue(value);

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
          onValueChange?.(UNCATEGORIZED_VALUE);
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
              return uncategorizedBadge;
            }
            const selectedId = decodeOptionValue(selectedValue);
            const selected = options.find((option) => option.id === selectedId);
            if (!selected) return placeholder;
            const Icon = selected.icon;
            const tone = categoryTone(selected);
            return (
              <Badge
                variant="outline"
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
        {allowUncategorized ? (
          <SelectItem value={UNCATEGORIZED_VALUE}>{uncategorizedBadge}</SelectItem>
        ) : null}
        {options.map((option) => {
          const Icon = option.icon;
          const tone = categoryTone(option);
          return (
            <SelectItem key={option.id} value={encodeOptionValue(option.id)}>
              <Badge
                variant="outline"
                className={cn("gap-1 border-transparent", tone.className)}
                style={tone.style}
              >
                <Icon className="size-3" />
                {option.name}
              </Badge>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
