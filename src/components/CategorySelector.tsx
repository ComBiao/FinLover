"use client";

import * as React from "react";
import { QueryClientContext } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { CATEGORY_STYLES, resolveChipTone } from "@/components/chipColor";
import { ALL_VALUE, decodeOptionValue, encodeOptionValue } from "@/components/optionValue";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Category, TransactionType } from "@/types/category";
import { useCategories } from "@/features/categories/hooks/useCategories";

function categoryTone(category: Category) {
  return resolveChipTone(category.color, CATEGORY_STYLES, category.id);
}

/** Group headings when both types are listed — same icons/colors as `TransactionTypeSelector`, expense first like the rest of the app. */
const TYPE_GROUPS: { type: TransactionType; label: string; Icon: LucideIcon; className: string }[] = [
  { type: "expense", label: "Expense", Icon: ArrowDownRight, className: "text-destructive" },
  { type: "income", label: "Income", Icon: ArrowUpRight, className: "text-success" },
];

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
};

/**
 * Dropdown for picking a category, optionally filtered by transaction type
 * (income/expense). Pass `allowAll` to add an "All categories" option for
 * filter UIs (reported back to `onValueChange` as `undefined`, meaning "no
 * filter"). Real option values are encoded with a prefix internally so a
 * category whose `id` happens to be "all" can never collide with the
 * `allowAll` sentinel. There's no "Uncategorized" option: a transaction
 * without a category counts as its type's seeded "Others".
 */
function CategorySelectorBase({
  id,
  name,
  type,
  value = "",
  onValueChange,
  categories = [],
  placeholder = "Select a category",
  disabled,
  className,
  allowAll = false,
  allLabel = "All categories",
}: CategorySelectorProps) {
  const options = type ? categories.filter((category) => category.type === type) : categories;

  // Place selected category first, followed by the remaining categories below it
  const orderedOptions = React.useMemo(() => {
    if (!value) return options;
    const selected = options.find((category) => category.id === value);
    if (!selected) return options;
    return [selected, ...options.filter((category) => category.id !== value)];
  }, [options, value]);

  // Without a `type`, income and expense categories are listed together, and
  // the seeded "Others" exists once per type — so group the list by type and
  // name the type on the trigger whenever the picked name exists in both.
  const groupByType = !type;
  const hasNameInOtherType = (category: Category) =>
    options.some((option) => option.type !== category.type && option.name === category.name);

  function renderBadge(category: Category, { withType = false } = {}) {
    const Icon = category.icon;
    const tone = categoryTone(category);
    return (
      <Badge variant="outline" className={cn("gap-1 border-transparent", tone.className)} style={tone.style}>
        <Icon className="size-3" />
        {category.name}
        {withType ? (
          <span className="font-normal opacity-70">· {category.type === "income" ? "Income" : "Expense"}</span>
        ) : null}
      </Badge>
    );
  }

  function renderItem(option: Category) {
    return (
      <SelectItem key={option.id} value={encodeOptionValue(option.id)}>
        {renderBadge(option)}
      </SelectItem>
    );
  }

  const selectValue = !value ? (allowAll ? ALL_VALUE : "") : encodeOptionValue(value);

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
            const selected = options.find((option) => option.id === selectedId);
            if (!selected) return placeholder;
            return renderBadge(selected, { withType: groupByType && hasNameInOtherType(selected) });
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allowAll ? <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem> : null}
        {groupByType
          ? TYPE_GROUPS.map(({ type: groupType, label, Icon, className: labelClassName }, index) => {
              const groupOptions = orderedOptions.filter((option) => option.type === groupType);
              if (groupOptions.length === 0) return null;
              const hasItemsAbove = allowAll || index > 0;
              return (
                <React.Fragment key={groupType}>
                  {hasItemsAbove ? <SelectSeparator /> : null}
                  <SelectGroup>
                    <SelectLabel
                      className={cn("flex items-center gap-1 font-semibold tracking-wide uppercase", labelClassName)}
                    >
                      <Icon className="size-3.5" />
                      {label}
                    </SelectLabel>
                    {groupOptions.map(renderItem)}
                  </SelectGroup>
                </React.Fragment>
              );
            })
          : orderedOptions.map(renderItem)}
      </SelectContent>
    </Select>
  );
}

function CategorySelectorWithQuery(props: CategorySelectorProps) {
  const { data: categories = [] } = useCategories();
  return <CategorySelectorBase {...props} categories={categories} />;
}

/**
 * Dropdown for picking a category. Uses the real categories from `useCategories()`
 * when inside a QueryClientProvider and no `categories` prop is supplied.
 */
export function CategorySelector(props: CategorySelectorProps) {
  const hasQueryClient = Boolean(React.useContext(QueryClientContext));

  if (props.categories !== undefined || !hasQueryClient) {
    return <CategorySelectorBase {...props} />;
  }
  return <CategorySelectorWithQuery {...props} />;
}
