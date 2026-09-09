"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

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
import { WalletSelector } from "@/components/WalletSelector";
import { cn, todayISODate } from "@/lib/utils";
import { useTransactionModal } from "@/store/useTransactionModal";
import type { TransactionType } from "@/types/category";
import type { Transaction } from "@/types/transaction";

const addTransactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
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
  categoryId: z.string().min(1, "Category is required"),
  note: z.string().optional(),
});

type AddTransactionFormValues = z.infer<typeof addTransactionFormSchema>;

type AddTransactionModalProps = {
  /** Row to edit, populating the form and switching the modal into edit mode. Omit (or `null`) for Add mode. */
  initialData?: Transaction | null;
};

function toFormValues(
  transaction: Transaction | null | undefined,
  fallbackType: TransactionType
): AddTransactionFormValues {
  if (!transaction) {
    return {
      type: fallbackType,
      amount: "",
      date: todayISODate(),
      walletId: "",
      categoryId: "",
      note: "",
    };
  }

  return {
    type: transaction.type,
    amount: String(transaction.amount),
    date: transaction.date.toISOString().slice(0, 10),
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
export function AddTransactionModal({ initialData }: AddTransactionModalProps = {}) {
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
   * Validates the form with react-hook-form + zod. Creation/update isn't
   * wired up yet, so a valid submission intentionally leaves the modal open
   * rather than closing as if the transaction were saved.
   * TODO: on successful validation, POST /api/transactions (create) or
   * PUT /api/transactions/:id (edit) with { type, amount, date, categoryId,
   * walletId, note }, then closeModal().
   */
  function onSubmit(values: AddTransactionFormValues) {
    const payload = { ...values, amount: Number(values.amount) };
    console.log(isEditMode ? "Update transaction" : "Create transaction", payload);
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
          <DialogTitle>{isEditMode ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
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
                  onValueChange={(nextCategoryId) => field.onChange(nextCategoryId ?? "")}
                />
              )}
            />
            {errors.categoryId ? (
              <p className="text-destructive text-sm">{errors.categoryId.message}</p>
            ) : null}
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
