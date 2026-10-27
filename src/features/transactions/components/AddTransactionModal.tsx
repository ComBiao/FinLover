"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownRight, ArrowUpRight, Check, Trash2, X, type LucideIcon } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { hexToRgba, shadeHex } from "@/components/chipColor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WalletSelector } from "@/components/WalletSelector";
import { ApiClientError } from "@/lib/api/client";
import { cn, todayISODate, toLocalISODate } from "@/lib/utils";
import { isFallbackCategory } from "@/features/categories/categoriesService";
import { resolveCategoryIcon } from "@/features/categories/categoryIcons";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { displayName, useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useWallets } from "@/features/wallets/hooks/useWallets";
import { useTransactionModal } from "@/features/transactions/store/useTransactionModal";
import { SHARED_CATEGORY_PRESETS, defaultSharedCategoryKey } from "@/shared/contracts";
import type { TransactionType } from "@/types/category";
import type { Transaction } from "@/types/transaction";

const addTransactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  title: z.string().trim().min(1, "Title is required"),
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
  /** Shared wallets pick one of the fixed presets by key instead of a personal category. */
  categoryKey: z.string().optional(),
  note: z.string().optional(),
});

type AddTransactionFormValues = z.infer<typeof addTransactionFormSchema>;

type AddTransactionModalProps = {
  /** Row to edit, populating the form and switching the modal into edit mode. Omit (or `null`) for Add mode. */
  initialData?: Transaction | null;
  /**
   * Called with the new transaction's data (no `id` yet — the server
   * assigns it) when submitting in Add mode. Awaited: the modal stays open
   * and disabled until this resolves, and shows the rejection's message
   * instead of closing if it throws.
   *
   * Optional only because `src/app/dashboard/page.tsx` still renders this
   * modal with no props at all (its own quick-add flow isn't wired —
   * tracked separately, #95/US2-9) — `onSubmit` below checks for this and
   * shows an error instead of silently closing as if the create succeeded.
   */
  onAdd?: (transaction: Omit<Transaction, "id">) => Promise<void>;
  /** Called with the updated transaction when submitting in Edit mode. */
  onEdit?: (transaction: Transaction) => Promise<void>;
};

/**
 * Per-type theming for the modal — a soft/solid pair of the type's own color
 * (reusing the shared destructive/success theme tokens, same as the rest of
 * the app) plus the copy that changes with the mode, so the user can always
 * tell at a glance which kind of transaction they're recording.
 */
const MODE_STYLES: Record<
  TransactionType,
  {
    Icon: LucideIcon;
    noun: string;
    amountLabel: string;
    titleHint: string;
    walletLabel: string;
    borderClass: string;
    solidBgClass: string;
    softBgClass: string;
    textClass: string;
  }
> = {
  expense: {
    Icon: ArrowDownRight,
    noun: "expense",
    amountLabel: "Money out",
    titleHint: "e.g. Grab ride, coffee",
    walletLabel: "Pay from wallet",
    borderClass: "border-t-destructive",
    solidBgClass: "bg-destructive",
    softBgClass: "bg-danger-bg",
    textClass: "text-destructive",
  },
  income: {
    Icon: ArrowUpRight,
    noun: "income",
    amountLabel: "Money in",
    titleHint: "e.g. Salary, tutoring",
    walletLabel: "Deposit to wallet",
    borderClass: "border-t-success",
    solidBgClass: "bg-success",
    softBgClass: "bg-success-bg",
    textClass: "text-success",
  },
};

/**
 * Hex equivalents of the on-theme chip colors used elsewhere (chart-1..4,
 * success, primary from globals.css) — categories don't carry a `color` hex
 * yet, so this stands in for that single source color, letting a chip's
 * fill tint and text/border shade both be derived from one value instead of
 * two independently-picked Tailwind classes (which isn't guaranteed to give
 * a readable border against the fill).
 */
const CATEGORY_PRESET_HEX: Record<string, string> = {
  "food-drink": "#f0c48a",
  transport: "#9b8afb",
  shopping: "#f6b8c8",
  bills: "#7fc7c4",
  salary: "#3c8060",
  freelance: "#4f9d78",
  saving: "#9b8afb",
};
const DEFAULT_CHIP_HEX = "#8a879a";

function resolveCategoryChipHex(id: string, explicitColor: string | undefined) {
  if (explicitColor) return explicitColor;
  return CATEGORY_PRESET_HEX[id] ?? DEFAULT_CHIP_HEX;
}

/** Strips an amount input down to digits and at most one decimal point with at most 2 decimal places — applied on every change (typed or pasted). */
function sanitizeAmountInput(raw: string) {
  const digitsAndDots = raw.replace(/[^0-9.]/g, "");
  const firstDotIndex = digitsAndDots.indexOf(".");
  if (firstDotIndex === -1) return digitsAndDots;

  const wholePart = digitsAndDots.slice(0, firstDotIndex + 1);
  const decimalPart = digitsAndDots.slice(firstDotIndex + 1).replace(/\./g, "").slice(0, 2);
  return wholePart + decimalPart;
}

/** Parses a `YYYY-MM-DD` string (from `<input type="date">`) as a local date — `new Date(value)` would parse it as UTC midnight, which can render as the previous day in timezones behind UTC. */
function parseLocalISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toFormValues(
  transaction: Transaction | null | undefined,
  fallbackType: TransactionType,
  fallbackWalletId?: string
): AddTransactionFormValues {
  if (!transaction) {
    return {
      type: fallbackType,
      title: "",
      amount: "",
      date: todayISODate(),
      walletId: fallbackWalletId ?? "",
      categoryId: "",
      categoryKey: "",
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
    categoryKey: transaction.categoryKey ?? "",
    note: transaction.note ?? "",
  };
}

/** Shared wallets only: tells the user whose name the transaction will carry. Its own component so the user query only runs for shared wallets. */
function LoggedByNote({ transaction }: { transaction: Transaction | null | undefined }) {
  const { data: currentUser } = useCurrentUser();
  const name = transaction?.createdBy?.name ?? displayName(currentUser);
  if (!name) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {transaction?.createdBy ? `Logged by ${name}` : `Will be logged by ${name}`}
    </p>
  );
}

/**
 * Modal form for creating a new income/expense transaction, or (when given
 * `initialData`) editing an existing one — both share this one form, opened
 * via the zustand `useTransactionModal` store. Shared by the Transactions
 * page and Home, so its look is identical on both.
 */
export function AddTransactionModal({
  initialData,
  onAdd,
  onEdit,
}: AddTransactionModalProps = {}) {
  const { isOpen, defaultType, defaultWalletId, editingTransaction, closeModal, openDeleteModal } =
    useTransactionModal();
  const { data: categories = [] } = useCategories();
  const { data: wallets = [] } = useWallets();
  const effectiveInitialData = initialData ?? editingTransaction;
  const isEditMode = Boolean(effectiveInitialData);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<AddTransactionFormValues>({
    resolver: zodResolver(addTransactionFormSchema),
    defaultValues: toFormValues(effectiveInitialData, defaultType, defaultWalletId),
  });

  const type = useWatch({ control, name: "type" });
  const watchedValues = useWatch({ control });
  const categoryIdValue = useWatch({ control, name: "categoryId" });
  const categoryKeyValue = useWatch({ control, name: "categoryKey" });
  const walletIdValue = useWatch({ control, name: "walletId" });
  const mode = MODE_STYLES[type];
  // Shared wallets offer the fixed preset categories (by key) instead of the user's own.
  const isSharedWallet = Boolean(wallets.find((wallet) => wallet.id === walletIdValue)?.isShared);

  React.useEffect(() => {
    if (isOpen) {
      reset(toFormValues(effectiveInitialData, defaultType, defaultWalletId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // `root` isn't tied to a field, so react-hook-form never clears it on its
  // own — a rejected submit (e.g. "wallet not found") would otherwise keep
  // showing after the user picks a different wallet and looks fixed.
  React.useEffect(() => {
    clearErrors("root");
  }, [watchedValues, clearErrors]);

  function handleTypeChange(nextType: TransactionType) {
    setValue("type", nextType);
    setValue("categoryId", "");
    setValue("categoryKey", "");
  }

  /**
   * Validates the form with react-hook-form + zod, then either updates
   * client-side state directly (Edit mode — still local-only, see #102) or
   * awaits the real `POST /api/v1/transactions` call (Add mode, #100).
   * Only closes the modal after a create actually succeeds; a rejection
   * surfaces as a form-level error instead, and the modal (and submit
   * button) stays disabled for the whole await via `isSubmitting`.
   */
  async function onSubmit(values: AddTransactionFormValues) {
    const shared = {
      type: values.type,
      title: values.title,
      amount: Number(values.amount),
      date: parseLocalISODate(values.date),
      walletId: values.walletId,
      categoryId: !isSharedWallet && values.categoryId ? values.categoryId : undefined,
      categoryKey: isSharedWallet && values.categoryKey ? values.categoryKey : undefined,
      note: values.note ? values.note : undefined,
    };

    const submit =
      isEditMode && effectiveInitialData
        ? onEdit && (() => onEdit({ ...effectiveInitialData, ...shared }))
        : onAdd && (() => onAdd(shared));
    if (!submit) {
      setError("root", { message: "Can't save: this form isn't connected yet." });
      return;
    }

    try {
      await submit();
      closeModal();
    } catch (error) {
      setError("root", {
        message:
          error instanceof ApiClientError
            ? error.message
            : "Unable to connect. Please try again.",
      });
    }
  }

  const typeCategories = categories.filter((category) => category.type === type);
  const fallbackCategory = typeCategories.find(isFallbackCategory);
  const orderedCategories = fallbackCategory
    ? [fallbackCategory, ...typeCategories.filter((category) => category !== fallbackCategory)]
    : typeCategories;

  // A transaction without a category means "Others", so preselect it whenever
  // the field is empty: a fresh Add, a type switch (which clears the field),
  // or editing a row whose category was deleted. Waits for categories to load,
  // and leaves the field empty if this user has no seeded "Others".
  const fallbackCategoryId = fallbackCategory?.id;
  React.useEffect(() => {
    if (isOpen && !isSharedWallet && !categoryIdValue && fallbackCategoryId) {
      setValue("categoryId", fallbackCategoryId);
    }
  }, [isOpen, isSharedWallet, categoryIdValue, fallbackCategoryId, setValue]);

  // Same for a shared wallet: preselect its "Others" for the current type whenever the key is empty.
  React.useEffect(() => {
    if (isOpen && isSharedWallet && !categoryKeyValue) setValue("categoryKey", defaultSharedCategoryKey(type));
  }, [isOpen, isSharedWallet, categoryKeyValue, type, setValue]);

  // Picking a shared wallet drops any category chosen for a personal one, and the other way round.
  React.useEffect(() => {
    if (isSharedWallet && categoryIdValue) setValue("categoryId", "");
    if (!isSharedWallet && categoryKeyValue) setValue("categoryKey", "");
  }, [isSharedWallet, categoryIdValue, categoryKeyValue, setValue]);

  // Shared wallets list the fixed presets (same order as the personal defaults, "Others" last).
  const sharedCategories = SHARED_CATEGORY_PRESETS.filter((preset) => preset.type === type).map((preset) => ({
    id: preset.key,
    name: preset.name,
    icon: resolveCategoryIcon(preset.icon),
    color: preset.color,
  }));
  const selectedCategoryValue = isSharedWallet ? categoryKeyValue : categoryIdValue;
  const categoryChips = (isSharedWallet ? sharedCategories : orderedCategories).map((category) => {
    const selected = selectedCategoryValue === category.id;
    const hex = resolveCategoryChipHex(category.id, category.color);
    const textColor = shadeHex(hex, 0.6);
    return {
      id: category.id,
      name: category.name,
      icon: category.icon,
      selected,
      textColor,
      backgroundColor: hexToRgba(hex, selected ? 0.22 : 0.12),
      borderColor: selected ? textColor : "transparent",
    };
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Block backdrop-click / Escape dismissal while a create is in
        // flight — closing mid-request would let the user reopen the
        // modal and have the first request's effects land on a form they
        // believe is fresh (same race class as #101's category dialog).
        if (!open && isSubmitting) return;
        if (!open) closeModal();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex max-h-[calc(100vh-32px)] flex-col gap-0 overflow-hidden rounded-2xl border-t-[6px] p-0 sm:max-w-lg",
          mode.borderClass
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-5 pb-1">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                mode.softBgClass,
                mode.textClass
              )}
            >
              <mode.Icon className="size-4.5" />
            </span>
            <DialogTitle className="text-xl font-bold text-foreground capitalize">
              {isEditMode ? `Edit ${mode.noun}` : `Add ${mode.noun}`}
            </DialogTitle>
          </div>
          <DialogClose
            render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Close" className="max-sm:size-10" />}
          >
            <X className="size-4.5" />
          </DialogClose>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-3">
            <div
              role="radiogroup"
              aria-label="Transaction type"
              className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
            >
              <button
                type="button"
                role="radio"
                aria-checked={type === "expense"}
                onClick={() => handleTypeChange("expense")}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-bold transition-colors",
                  type === "expense"
                    ? cn(MODE_STYLES.expense.solidBgClass, "text-destructive-foreground shadow-sm")
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ArrowDownRight className="size-4" />
                Expense
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={type === "income"}
                onClick={() => handleTypeChange("income")}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-bold transition-colors",
                  type === "income"
                    ? cn(MODE_STYLES.income.solidBgClass, "text-white shadow-sm")
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ArrowUpRight className="size-4" />
                Income
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="transaction-amount" className={cn("text-sm font-bold", mode.textClass)}>
                {mode.amountLabel}
              </Label>
              <div
                className={cn(
                  "flex items-center gap-3.5 rounded-2xl border-2 p-4",
                  mode.softBgClass,
                  errors.amount ? "border-destructive" : "border-transparent"
                )}
              >
                <span
                  className={cn(
                    "flex size-13 shrink-0 items-center justify-center rounded-full text-white",
                    mode.solidBgClass
                  )}
                >
                  <mode.Icon className="size-6.5" />
                </span>
                <span aria-hidden="true" className={cn("text-3xl font-extrabold sm:text-[38px]", mode.textClass)}>
                  ฿
                </span>
                <input
                  id="transaction-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-invalid={Boolean(errors.amount)}
                  aria-describedby={errors.amount ? "transaction-amount-error" : undefined}
                  className={cn(
                    "w-0 min-w-0 flex-1 border-none bg-transparent text-3xl font-extrabold tracking-tight outline-none placeholder:opacity-35 sm:text-[38px]",
                    mode.textClass
                  )}
                  {...register("amount", {
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                      event.target.value = sanitizeAmountInput(event.target.value);
                    },
                  })}
                />
              </div>
              {errors.amount ? (
                <span id="transaction-amount-error" role="alert" className="text-sm font-semibold text-destructive">
                  {errors.amount.message}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transaction-title">Title</Label>
              <Input
                id="transaction-title"
                placeholder={mode.titleHint}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "transaction-title-error" : undefined}
                {...register("title")}
              />
              {errors.title ? (
                <p id="transaction-title-error" className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                  <p id="transaction-date-error" className="text-sm text-destructive">
                    {errors.date.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="transaction-wallet">{mode.walletLabel}</Label>
                <Controller
                  control={control}
                  name="walletId"
                  render={({ field }) => (
                    <WalletSelector
                      id="transaction-wallet"
                      value={field.value}
                      onValueChange={(nextWalletId) => field.onChange(nextWalletId ?? "")}
                      // Editing never moves a row into or out of a shared wallet: a shared row's wallet is
                      // locked (still shown), and a personal row can only go to another personal wallet.
                      includeShared={!isEditMode || isSharedWallet}
                      disabled={isSubmitting || (isEditMode && isSharedWallet)}
                    />
                  )}
                />
                {errors.walletId ? (
                  <p className="text-sm text-destructive">{errors.walletId.message}</p>
                ) : null}
              </div>
            </div>

            <div role="radiogroup" aria-label="Category" className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <div className="flex flex-wrap gap-2">
                {categoryChips.map((chip) => {
                  // The check swaps in for the category icon (same size, same
                  // weight text) so selecting a chip never changes its width —
                  // a wider chip would re-wrap the row and make chips jump.
                  const Icon = chip.selected ? Check : chip.icon;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      role="radio"
                      aria-checked={chip.selected}
                      onClick={() => setValue(isSharedWallet ? "categoryKey" : "categoryId", chip.id)}
                      className="inline-flex h-10 items-center gap-1.5 rounded-full border-2 px-3.5 text-sm font-semibold transition-colors"
                      style={{
                        backgroundColor: chip.backgroundColor,
                        color: chip.textColor,
                        borderColor: chip.borderColor,
                      }}
                    >
                      <Icon className="size-4" strokeWidth={chip.selected ? 3 : undefined} />
                      {chip.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transaction-note">Note</Label>
              <Textarea
                id="transaction-note"
                placeholder="Optional note"
                rows={2}
                {...register("note")}
              />
            </div>

            {isSharedWallet ? <LoggedByNote transaction={effectiveInitialData} /> : null}

            {errors.root ? (
              <p className="text-destructive text-sm" role="alert">
                {errors.root.message}
              </p>
            ) : null}
          </div>

          <DialogFooter
            className={cn(
              "mx-0 mb-0 shrink-0 gap-3 rounded-b-2xl px-6 pt-4 pb-5",
              isEditMode ? "sm:justify-between" : "sm:justify-end"
            )}
          >
            {isEditMode && effectiveInitialData ? (
              <Button
                type="button"
                variant="outline"
                className="shrink-0 text-destructive whitespace-nowrap hover:text-destructive sm:mr-auto"
                onClick={() => openDeleteModal(effectiveInitialData)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="shrink-0 whitespace-nowrap"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={cn(mode.solidBgClass, "shrink-0 text-white whitespace-nowrap hover:opacity-90")}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving…" : isEditMode ? "Save changes" : `Save ${mode.noun}`}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
