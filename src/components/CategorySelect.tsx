import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Briefcase,
  Car,
  Gift,
  Landmark,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TransactionType = "income" | "expense";

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
  icon: LucideIcon;
};

// TODO: replace with categories fetched from /api/categories via react-query.
export const MOCK_CATEGORIES: Category[] = [
  { id: "food-drink", name: "Food & Drink", type: "expense", icon: UtensilsCrossed },
  { id: "transport", name: "Transport", type: "expense", icon: Car },
  { id: "shopping", name: "Shopping", type: "expense", icon: ShoppingBag },
  { id: "gifts", name: "Gifts", type: "expense", icon: Gift },
  { id: "salary", name: "Salary", type: "income", icon: Banknote },
  { id: "freelance", name: "Freelance", type: "income", icon: Briefcase },
  { id: "investment", name: "Investment", type: "income", icon: Landmark },
];

type CategorySelectProps = {
  id?: string;
  type: TransactionType;
  value?: string;
  onValueChange?: (categoryId: string) => void;
  categories?: Category[];
  placeholder?: string;
  disabled?: boolean;
};

/**
 * Dropdown for picking a category filtered by transaction type (income/expense).
 */
export function CategorySelect({
  id,
  type,
  value = "",
  onValueChange,
  categories = MOCK_CATEGORIES,
  placeholder = "Select a category",
  disabled,
}: CategorySelectProps) {
  const options = categories.filter((category) => category.type === type);

  return (
    <Select
      value={value}
      onValueChange={(newValue) => {
        if (newValue) onValueChange?.(newValue);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder}>
          {(selectedId: string) => {
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
        {options.map(({ id, name, icon: Icon }) => (
          <SelectItem key={id} value={id}>
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
