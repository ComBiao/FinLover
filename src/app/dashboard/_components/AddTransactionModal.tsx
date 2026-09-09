"use client";

import * as React from "react";

import { CategorySelector } from "@/components/CategorySelector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTransactionModal } from "@/store/useTransactionModal";
import type { TransactionType } from "@/types/category";
import { transactionSchema } from "@/types/transaction";

type FieldErrors = Partial<Record<"amount" | "date" | "categoryId", string>>;

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Modal form for creating a new income or expense transaction, opened via
 * the zustand `useTransactionModal` store.
 */
export function AddTransactionModal() {
  const { isOpen, defaultType, closeModal } = useTransactionModal();

  const [type, setType] = React.useState<TransactionType>(defaultType);
  const [categoryId, setCategoryId] = React.useState("");
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [wasOpen, setWasOpen] = React.useState(isOpen);

  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setType(defaultType);
      setCategoryId("");
      setErrors({});
    }
  }

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType);
    setCategoryId("");
  }

  /**
   * Validates the form with the transaction zod schema and surfaces per-field
   * error messages instead of submitting.
   * TODO: on successful validation, POST /api/transactions with
   * { type, amount, date, categoryId, note }.
   */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const result = transactionSchema.safeParse({
      type,
      amount: formData.get("amount"),
      date: formData.get("date"),
      categoryId,
      note: formData.get("note"),
    });

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    closeModal();
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => handleTypeChange("expense")}
              className={cn(
                "h-9 rounded-md text-sm font-semibold transition-colors",
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
                "h-9 rounded-md text-sm font-semibold transition-colors",
                type === "income"
                  ? "bg-success-bg text-success shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Income
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transaction-amount">Amount</Label>
            <Input
              id="transaction-amount"
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? "transaction-amount-error" : undefined}
            />
            {errors.amount ? (
              <p id="transaction-amount-error" className="text-xs text-destructive">
                {errors.amount}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transaction-date">Date</Label>
            <Input
              id="transaction-date"
              name="date"
              type="date"
              defaultValue={todayISODate()}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? "transaction-date-error" : undefined}
            />
            {errors.date ? (
              <p id="transaction-date-error" className="text-xs text-destructive">
                {errors.date}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transaction-category">Category</Label>
            <CategorySelector
              id="transaction-category"
              type={type}
              value={categoryId}
              onValueChange={(nextCategoryId) => setCategoryId(nextCategoryId ?? "")}
            />
            {errors.categoryId ? (
              <p className="text-xs text-destructive">{errors.categoryId}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transaction-note">Note</Label>
            <Textarea
              id="transaction-note"
              name="note"
              placeholder="Optional note"
              rows={3}
            />
          </div>

          <DialogFooter className="sm:justify-end">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit">Save transaction</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
