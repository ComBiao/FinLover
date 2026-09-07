"use client";

import * as React from "react";
import { CalendarDays, Plus, Tag, X } from "lucide-react";

import { MOCK_CATEGORIES, type TransactionType } from "@/components/CategorySelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { transactionSchema } from "@/types/transaction";

type FieldErrors = Partial<Record<"amount", string>>;

const MONTH_ABBREVIATIONS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

/** Compact label for the date button: "Today" or e.g. "7 Sep". */
function formatDateLabel(isoDate: string) {
  if (isoDate === todayISODate()) return "Today";
  const [, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTH_ABBREVIATIONS[month - 1]}`;
}

/**
 * Floating quick-entry bar for adding a transaction without opening the
 * full Add Transaction modal. Defaults to expanded; collapses into a
 * circular (+) button and expands back on demand.
 */
export function QuickAddBar() {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [type, setType] = React.useState<TransactionType>("expense");
  const [categoryId, setCategoryId] = React.useState("");
  const [date, setDate] = React.useState(todayISODate);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  const categoryOptions = MOCK_CATEGORIES.filter((category) => category.type === type);
  const selectedCategory = categoryOptions.find((category) => category.id === categoryId);

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType);
    setCategoryId("");
  }

  /**
   * Opens the native date picker for the hidden date input backing the
   * calendar button. `showPicker` needs a direct user gesture and isn't
   * supported everywhere, so fall back to focusing the input (still
   * keyboard-editable) if it throws or isn't available.
   */
  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        // fall through to focus
      }
    }
    input.focus();
  }

  /**
   * Validates with the shared transaction zod schema and surfaces field
   * errors instead of submitting. Category is optional here — an empty
   * selection is submitted as `categoryId: null` (uncategorized).
   * TODO: on successful validation, POST /api/transactions with
   * { type, amount, date, categoryId, note }.
   */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const result = transactionSchema.safeParse({
      type,
      amount: formData.get("amount"),
      date,
      categoryId: categoryId || null,
      note: formData.get("description"),
    });

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (field === "amount" && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    event.currentTarget.reset();
    setCategoryId("");
    setDate(todayISODate());
  }

  if (!isExpanded) {
    return (
      <Button
        type="button"
        size="icon"
        onClick={() => setIsExpanded(true)}
        aria-label="Add transaction"
        className="fixed bottom-6 right-6 z-40 size-14 cursor-pointer rounded-full shadow-2xl transition-all duration-300 hover:scale-105"
      >
        <Plus className="size-6" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 transition-all duration-300">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full max-w-3xl flex-wrap items-center gap-1.5 rounded-full border border-border bg-card p-1.5 shadow-2xl transition-all duration-300 sm:flex-nowrap"
      >
        <div className="flex shrink-0 gap-1 rounded-full bg-muted p-1">
          <button
            type="button"
            onClick={() => handleTypeChange("expense")}
            className={cn(
              "cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              type === "expense"
                ? "bg-danger-bg text-destructive shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("income")}
            className={cn(
              "cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              type === "income"
                ? "bg-success-bg text-success shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Income
          </button>
        </div>

        <Input
          name="description"
          placeholder="Grab, coffee..."
          aria-label="Description"
          className="h-9 min-w-24 flex-1 rounded-full border-none bg-muted px-3.5 shadow-none focus-visible:ring-2"
        />

        <div className="relative flex shrink-0 items-center">
          <span className="pointer-events-none absolute left-3.5 text-sm text-muted-foreground">
            ฿
          </span>
          <Input
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0"
            aria-label="Amount"
            aria-invalid={Boolean(errors.amount)}
            className="h-9 w-24 rounded-full border-none bg-muted pl-6 shadow-none focus-visible:ring-2"
          />
        </div>

        <Select
          value={categoryId}
          onValueChange={(value) => {
            if (value) setCategoryId(value);
          }}
        >
          <SelectTrigger
            aria-label={
              selectedCategory ? `Category: ${selectedCategory.name}` : "Category: Uncategorized"
            }
            title={selectedCategory ? selectedCategory.name : "Uncategorized"}
            className="h-9 shrink-0 cursor-pointer gap-1 rounded-full border-none bg-muted px-2.5"
          >
            <SelectValue>
              {() => {
                const Icon = selectedCategory?.icon ?? Tag;
                return <Icon className="size-4 text-muted-foreground" />;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map(({ id, name, icon: Icon }) => (
              <SelectItem key={id} value={id}>
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex shrink-0 items-center">
          <button
            type="button"
            onClick={openDatePicker}
            title="Click to pick a date"
            aria-label={`Date: ${formatDateLabel(date)}. Click to change.`}
            className="flex h-9 w-full cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-muted px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70"
          >
            <CalendarDays className="size-4 shrink-0" />
            {formatDateLabel(date)}
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value || todayISODate())}
            tabIndex={-1}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full opacity-0"
          />
        </div>

        <Button
          type="submit"
          size="icon"
          aria-label="Add transaction"
          className="size-9 shrink-0 cursor-pointer rounded-full"
        >
          <Plus className="size-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(false)}
          aria-label="Minimize"
          className="size-9 shrink-0 cursor-pointer rounded-full"
        >
          <X className="size-4" />
        </Button>
      </form>
    </div>
  );
}
