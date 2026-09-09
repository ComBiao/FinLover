"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { CategorySelector, UNCATEGORIZED_VALUE } from "@/components/CategorySelector";
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
import { WalletSelector } from "@/components/WalletSelector";
import { cn, todayISODate } from "@/lib/utils";
import { useTransactionModal } from "@/store/useTransactionModal";
import type { TransactionType } from "@/types/category";
import type { Transaction } from "@/types/transaction";

const addTransactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  title: z.string().min(1, "Title is required"),
  amount: z.string().superRefine((value, ctx) => {
    if (!value.trim()) {
      ctx.addIssue({ code: "custom", message: "Amount is required" });
      return;
    }
    if (Number.isNaN(Number(value)) || Number(value) <= 0) {
      ctx.addIssue({ code: "custom", message: "Amount must be greater than 0" });
    }
  }),
  date: z.string().min(1, "Date is required"),
  walletId: z.string().min(1, "Wallet is required"),
  categoryId: z.string().optional(),
  note: z.string().optional(),
});

type AddTransactionFormValues = z.infer<typeof addTransactionFormSchema>;

type AddTransactionModalProps = {
  /** Row to edit, populating the form and switching the modal into edit mode. Omit (or `null`) for Add mode. */
  initialData?: Transaction | null;
  /** Called with the newly created transaction when submitting in Add mode. */
  onAdd?: (transaction: Transaction) => void;
  /** Called with the updated transaction when submitting in Edit mode. */
  onEdit?: (transaction: Transaction) => void;
};

/** Formats a `Date` as a local `YYYY-MM-DD` string, matching what an `<input type="date">` expects — using `toISOString()` here would shift the date across midnight for any timezone ahead of UTC. */
function toLocalISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses a `YYYY-MM-DD` string (from `<input type="date">`) as a local date — `new Date(value)` would parse it as UTC midnight, which can render as the previous day in timezones behind UTC. */
function parseLocalISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toFormValues(
  transaction: Transaction | null | undefined,
  fallbackType: TransactionType
): AddTransactionFormValues {
  if (!transaction) {
    return {
      type: fallbackType,
      title: "",
      amount: "",
      date: todayISODate(),
      walletId: "",
      categoryId: "",
      note: "",
    };
  }

  return {
    type: transaction.type,
    title: transaction.title,
    amount: String(transaction.amount),
    date: toLocalISODate(transaction.date),
    walletId: transaction.walletId,
    categoryId: transaction.categoryId ?? "",
    note: transaction.note ?? "",
  };
}

/**
 * Modal form for creating a new income/expense transaction, or (when given
 * `initialData`) editing an existing one — both share this one form, opened
 * via the zustand `useTransactionModal` store.
 */
export function AddTransactionModal({
  initialData,
  onAdd,
  onEdit,
}: AddTransactionModalProps = {}) {
  const { isOpen, defaultType, editingTransaction, closeModal } = useTransactionModal();
  const effectiveInitialData = initialData ?? editingTransaction;
  const isEditMode = Boolean(effectiveInitialData);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AddTransactionFormValues>({
    resolver: zodResolver(addTransactionFormSchema),
    defaultValues: toFormValues(effectiveInitialData, defaultType),
  });

  const type = useWatch({ control, name: "type" });

  React.useEffect(() => {
    if (isOpen) {
      reset(toFormValues(effectiveInitialData, defaultType));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function handleTypeChange(nextType: TransactionType) {
    setValue("type", nextType);
    setValue("categoryId", "");
  }

  /**
   * Validates the form with react-hook-form + zod, then updates client-side
   * state via `onAdd`/`onEdit` so the list reflects the change immediately.
   * TODO: also POST /api/transactions (create) or PUT /api/transactions/:id
   * (edit) once the endpoint exists.
   */
  function onSubmit(values: AddTransactionFormValues) {
    const shared = {
      type: values.type,
      title: values.title,
      amount: Number(values.amount),
      date: parseLocalISODate(values.date),
      walletId: values.walletId,
      categoryId: values.categoryId ? values.categoryId : undefined,
      note: values.note ? values.note : undefined,
    };

    if (isEditMode && effectiveInitialData) {
      onEdit?.({ ...effectiveInitialData, ...shared });
    } else {
      onAdd?.({ id: crypto.randomUUID(), ...shared });
    }

    closeModal();
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
    >
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="flex flex-col gap-4 overflow-y-auto px-0.5 py-1">
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
              <Label htmlFor="transaction-title">Title</Label>
              <Input
                id="transaction-title"
                placeholder="e.g. Grab ride"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "transaction-title-error" : undefined}
                {...register("title")}
              />
              {errors.title ? (
                <p id="transaction-title-error" className="text-destructive text-sm">
                  {errors.title.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transaction-amount">Amount</Label>
              <Input
                id="transaction-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={errors.amount ? "transaction-amount-error" : undefined}
                {...register("amount")}
              />
              {errors.amount ? (
                <p id="transaction-amount-error" className="text-destructive text-sm">
                  {errors.amount.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transaction-date">Date</Label>
              <Input
                id="transaction-date"
                type="date"
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? "transaction-date-error" : undefined}
                {...register("date")}
              />
              {errors.date ? (
                <p id="transaction-date-error" className="text-destructive text-sm">
                  {errors.date.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transaction-wallet">Wallet</Label>
              <Controller
                control={control}
                name="walletId"
                render={({ field }) => (
                  <WalletSelector
                    id="transaction-wallet"
                    value={field.value}
                    onValueChange={(nextWalletId) => field.onChange(nextWalletId ?? "")}
                  />
                )}
              />
              {errors.walletId ? (
                <p className="text-destructive text-sm">{errors.walletId.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transaction-category">Category</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <CategorySelector
                    id="transaction-category"
                    type={type}
                    value={field.value}
                    onValueChange={(nextCategoryId) =>
                      field.onChange(
                        nextCategoryId === UNCATEGORIZED_VALUE ? "" : (nextCategoryId ?? "")
                      )
                    }
                    allowUncategorized
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transaction-note">Note</Label>
              <Textarea
                id="transaction-note"
                placeholder="Optional note"
                rows={3}
                {...register("note")}
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit">{isEditMode ? "Save changes" : "Save transaction"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
