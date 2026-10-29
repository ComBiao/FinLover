"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Edit3,
  Info,
  Repeat,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CategorySelector } from "@/components/CategorySelector";
import { WalletSelector } from "@/components/WalletSelector";
import { SHARED_CATEGORY_PRESETS, defaultSharedCategoryKey } from "@/shared/contracts";
import { resolveCategoryIcon } from "@/features/categories/categoryIcons";
import { cn, formatEnglishDayMonth, todayISODate } from "@/lib/utils";
import type { Category, TransactionType } from "@/types/category";
import type { Wallet } from "@/types/wallet";
import { formatCadenceString, getWeekdayClosestToDate, parseISODateParts } from "../dateCadence";
import type { EndConditionType, IntervalUnit, RecurringRule } from "../types";
import {
  MonthlyEndPicker,
  YearlyEndPicker,
  DailyWeeklyEndPicker,
  WeeklyIphoneClockPicker,
  getFirstAllowedDayDate,
  getFirstAllowedWeekDate,
  getFirstAllowedMonthKey,
  getFirstAllowedYear,
} from "./EndDatePickers";
import { StartDatePicker, formatDayMonthYear } from "./StartDatePicker";

const WEEKDAYS = [
  { label: "Mon", dayIndex: 1 },
  { label: "Tue", dayIndex: 2 },
  { label: "Wed", dayIndex: 3 },
  { label: "Thu", dayIndex: 4 },
  { label: "Fri", dayIndex: 5 },
  { label: "Sat", dayIndex: 6 },
  { label: "Sun", dayIndex: 0 },
];

type EditRuleFormProps = {
  rule: RecurringRule;
  wallets: Wallet[];
  categories: Category[];
  onCancel: () => void;
  onSave: (ruleId: string, updates: Partial<RecurringRule>) => Promise<void> | void;
};

function EditRuleForm({
  rule,
  wallets,
  categories,
  onCancel,
  onSave,
}: EditRuleFormProps) {
  const [type, setType] = useState<TransactionType>(rule.type);
  const [title, setTitle] = useState(rule.title);
  const [amount, setAmount] = useState(String(rule.amount));
  const [walletId, setWalletId] = useState<string | undefined>(
    wallets.some((w) => w.id === rule.walletId) ? rule.walletId : wallets[0]?.id
  );
  const selectedWallet = useMemo(() => wallets.find((w) => w.id === walletId), [wallets, walletId]);
  const isShared = Boolean(selectedWallet?.isShared);

  const sharedCategories = useMemo(() => {
    return SHARED_CATEGORY_PRESETS.filter((p) => p.type === type).map((p) => ({
      id: p.key,
      name: p.name,
      type: p.type,
      color: p.color,
      icon: resolveCategoryIcon(p.icon),
      isSystem: true,
    }));
  }, [type]);

  const [categoryId, setCategoryId] = useState<string | undefined>(
    rule.categoryKey || rule.categoryId || undefined
  );
  const [note, setNote] = useState(rule.note || "");
  const [startDate, setStartDate] = useState(rule.startDate);
  const [intervalNStr, setIntervalNStr] = useState(String(rule.intervalN));
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>(rule.intervalUnit);
  const [endType, setEndType] = useState<EndConditionType>(rule.endType);
  const [totalOccurrencesStr, setTotalOccurrencesStr] = useState(
    String(rule.totalOccurrences || 6)
  );

  const [endDate, setEndDate] = useState<string>(() => {
    if (rule.endDate) return rule.endDate;
    return getFirstAllowedDayDate(rule.startDate, rule.intervalN);
  });
  const [endMonth, setEndMonth] = useState<string>(() => {
    if (rule.endDate) return rule.endDate.slice(0, 7);
    return getFirstAllowedMonthKey(rule.startDate, rule.intervalN);
  });
  const [endYear, setEndYear] = useState<string>(() => {
    if (rule.endDate) return rule.endDate.slice(0, 4);
    return String(getFirstAllowedYear(rule.startDate, rule.intervalN));
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [startYear, startMonth, startDay] = useMemo(
    () => parseISODateParts(startDate),
    [startDate]
  );

  const startDayOfWeekIndex = useMemo(() => {
    const d = new Date(startYear, startMonth - 1, startDay);
    return d.getDay();
  }, [startYear, startMonth, startDay]);

  const effectiveIntervalN = useMemo(() => {
    const n = parseInt(intervalNStr, 10);
    return isNaN(n) || n <= 0 ? 1 : n;
  }, [intervalNStr]);

  const effectiveEndDate = useMemo(() => {
    if (endType !== "date") return "";
    if (intervalUnit === "months") {
      if (!endMonth) return "";
      const [ey, em] = parseISODateParts(endMonth);
      const daysInEndMonth = new Date(ey, em, 0).getDate();
      const clampedEndDay = Math.min(startDay, daysInEndMonth);
      return `${ey}-${String(em).padStart(2, "0")}-${String(clampedEndDay).padStart(2, "0")}`;
    }
    if (intervalUnit === "years") {
      const yNum = parseInt(endYear, 10);
      if (!yNum) return "";
      const daysInEndMonth = new Date(yNum, startMonth, 0).getDate();
      const clampedEndDay = Math.min(startDay, daysInEndMonth);
      return `${yNum}-${String(startMonth).padStart(2, "0")}-${String(clampedEndDay).padStart(2, "0")}`;
    }
    return endDate;
  }, [endType, intervalUnit, endMonth, endYear, endDate, startDay, startMonth]);

  const handleSelectEndType = (nextEndType: EndConditionType) => {
    setEndType(nextEndType);
    if (nextEndType === "date") {
      if (intervalUnit === "days") {
        setEndDate(getFirstAllowedDayDate(startDate, effectiveIntervalN));
      } else if (intervalUnit === "weeks") {
        setEndDate(getFirstAllowedWeekDate(startDate, effectiveIntervalN));
      } else if (intervalUnit === "months") {
        setEndMonth(getFirstAllowedMonthKey(startDate, effectiveIntervalN));
      } else if (intervalUnit === "years") {
        setEndYear(String(getFirstAllowedYear(startDate, effectiveIntervalN)));
      }
    }
  };

  const fallbackCategoryId = (forType: TransactionType) =>
    (categories.find((c) => c.type === forType && c.name.toLowerCase() === "others") ??
      categories.find((c) => c.type === forType))?.id;

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    setCategoryId(isShared ? defaultSharedCategoryKey(nextType) : fallbackCategoryId(nextType));
  };

  const handleUnitChange = (nextUnit: IntervalUnit) => {
    setIntervalUnit(nextUnit);
    if (endType === "date") {
      if (nextUnit === "days") {
        setEndDate(getFirstAllowedDayDate(startDate, effectiveIntervalN));
      } else if (nextUnit === "weeks") {
        setEndDate(getFirstAllowedWeekDate(startDate, effectiveIntervalN));
      } else if (nextUnit === "months") {
        setEndMonth(getFirstAllowedMonthKey(startDate, effectiveIntervalN));
      } else if (nextUnit === "years") {
        setEndYear(String(getFirstAllowedYear(startDate, effectiveIntervalN)));
      }
    }
  };

  const today = useMemo(() => todayISODate(), []);

  const handleSelectWeekday = (targetDayOfWeek: number) => {
    const nextDateStr = getWeekdayClosestToDate(targetDayOfWeek, startDate, today);
    setStartDate(nextDateStr);
    if (intervalUnit === "weeks") {
      setEndDate(getFirstAllowedWeekDate(nextDateStr, effectiveIntervalN));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage("Amount must be greater than ฿0.00");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Title is required");
      return;
    }

    if (!walletId) {
      setErrorMessage("Target wallet is required");
      return;
    }

    const n = parseInt(intervalNStr, 10);
    if (isNaN(n) || n <= 0) {
      setErrorMessage("Frequency interval must be at least 1");
      return;
    }
    if (intervalUnit === "days" && n > 365) {
      setErrorMessage("Days interval cannot exceed 365");
      return;
    }
    if (intervalUnit === "weeks" && n > 52) {
      setErrorMessage("Weeks interval cannot exceed 52");
      return;
    }
    if (intervalUnit === "months" && n > 60) {
      setErrorMessage("Months interval cannot exceed 60");
      return;
    }
    if (intervalUnit === "years" && n > 5) {
      setErrorMessage("Years interval cannot exceed 5");
      return;
    }

    if (endType === "count") {
      const occurrences = parseInt(totalOccurrencesStr, 10);
      if (isNaN(occurrences) || occurrences <= 0) {
        setErrorMessage("Total occurrences must be at least 1");
        return;
      }
    }

    if (endType === "date") {
      if (!effectiveEndDate) {
        setErrorMessage("Please select an end date");
        return;
      }
      if (effectiveEndDate <= startDate) {
        setErrorMessage("End date must be strictly after the start date");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSave(rule.id, {
        type,
        title: title.trim(),
        amount: numAmount,
        walletId,
        categoryId: isShared ? null : (categoryId || null),
        categoryKey: isShared ? categoryId : null,
        note: note.trim() || undefined,
        startDate,
        intervalN: n,
        intervalUnit,
        anchorDay: startDay,
        endType,
        totalOccurrences: endType === "count" ? parseInt(totalOccurrencesStr, 10) : undefined,
        endDate: endType === "date" ? effectiveEndDate : undefined,
      });
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "fields" in err &&
        (err as { fields?: Record<string, string> }).fields
      ) {
        setFieldErrors((err as { fields: Record<string, string> }).fields);
      }
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update recurring rule"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const cadencePreview = formatCadenceString({
    intervalN: effectiveIntervalN,
    intervalUnit,
    startDate,
    anchorDay: startDay,
  });

  const isMonthEndClamped =
    (intervalUnit === "months" || intervalUnit === "years") && startDay >= 29;

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4 pt-1">
      {errorMessage && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs font-semibold text-destructive">
          {errorMessage}
        </div>
      )}

      {/* Top-to-Bottom Flow */}

      {/* 1. Type: Segmented control matching Create Rule / Transaction Modal format */}
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
            "flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-bold transition-colors cursor-pointer",
            type === "expense"
              ? "bg-destructive text-destructive-foreground shadow-sm"
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
            "flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-bold transition-colors cursor-pointer",
            type === "income"
              ? "bg-success text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ArrowUpRight className="size-4" />
          Income
        </button>
      </div>

      {/* 2. Title */}
      <div className="space-y-1">
        <Label htmlFor="edit-title" className="text-xs font-semibold text-foreground">
          Title / Subscription Name *
        </Label>
        <Input
          id="edit-title"
          placeholder={
            type === "expense"
              ? "e.g. Netflix 4K, Condo Rent, Gym Membership"
              : "e.g. Monthly Salary, Freelance Retainer"
          }
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-9 text-xs"
          required
        />
        {fieldErrors.title && (
          <p className="text-[11px] text-destructive mt-0.5">{fieldErrors.title}</p>
        )}
      </div>

      {/* 3. Amount */}
      <div className="space-y-1">
        <Label htmlFor="edit-amount" className="text-xs font-semibold text-foreground">
          Future Amount (฿) *
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-sm font-bold text-muted-foreground">
            ฿
          </span>
          <Input
            id="edit-amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-9 pl-7 font-mono font-bold text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            required
          />
        </div>
        {fieldErrors.amount && (
          <p className="text-[11px] text-destructive mt-0.5">{fieldErrors.amount}</p>
        )}
      </div>

      {/* 4. Target Wallet & Category in a 2-column row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-foreground">Target Wallet *</Label>
          <WalletSelector
            value={walletId}
            onValueChange={(val) => {
              // Categories differ between shared and personal wallets, so only a switch across that line resets it.
              const nextShared = Boolean(wallets.find((w) => w.id === val)?.isShared);
              if (nextShared !== isShared) {
                setCategoryId(nextShared ? defaultSharedCategoryKey(type) : fallbackCategoryId(type));
              }
              setWalletId(val);
            }}
            wallets={wallets}
            placeholder="Choose wallet"
          />
          {(fieldErrors.walletId || fieldErrors.wallet_id) && (
            <p className="text-[11px] text-destructive mt-0.5">
              {fieldErrors.walletId || fieldErrors.wallet_id}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-foreground">Category</Label>
          <CategorySelector
            type={type}
            value={categoryId}
            onValueChange={(cat) => setCategoryId(cat)}
            categories={isShared ? sharedCategories : categories}
            placeholder="Category"
          />
          {(fieldErrors.categoryId || fieldErrors.category_id) && (
            <p className="text-[11px] text-destructive mt-0.5">
              {fieldErrors.categoryId || fieldErrors.category_id}
            </p>
          )}
        </div>
      </div>

      {/* 5. Custom Frequency Card (US4-1) */}
      <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Repeat className="size-3.5 text-primary" />
            <Label className="text-xs font-bold text-foreground">
              Custom Frequency & Interval
            </Label>
          </div>
          <span className="text-xs font-bold text-primary">{cadencePreview}</span>
        </div>

        {/* Interval Number & Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Every:</span>
            <Input
              id="edit-interval-count"
              aria-label="Interval count"
              type="text"
              inputMode="numeric"
              value={intervalNStr}
              onChange={(e) => setIntervalNStr(e.target.value.replace(/[^0-9]/g, ""))}
              className="h-9 font-semibold text-center text-xs"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Unit:</span>
            <Select
              value={intervalUnit}
              onValueChange={(val) => handleUnitChange(val as IntervalUnit)}
            >
              <SelectTrigger aria-label="Frequency Unit" className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="days">Day(s)</SelectItem>
                <SelectItem value="weeks">Week(s)</SelectItem>
                <SelectItem value="months">Month(s)</SelectItem>
                <SelectItem value="years">Year(s)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Start Date: Desktop-focused, larger, easy month selection, day month year output format */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-foreground">Start Date:</span>
            <span className="text-[11px] font-bold text-primary font-mono">
              {formatDayMonthYear(startDate)}
            </span>
          </div>
          <StartDatePicker
            id="edit-start-date"
            aria-label="Start Date"
            value={startDate}
            onChange={setStartDate}
          />
          {(fieldErrors.startDate || fieldErrors.start_date) && (
            <p className="text-[11px] text-destructive mt-0.5">
              {fieldErrors.startDate || fieldErrors.start_date}
            </p>
          )}
        </div>

        {/* Weekly: Day-of-week Mon-Sun selector */}
        {intervalUnit === "weeks" && (
          <div className="space-y-1.5 pt-1 border-t border-border/50">
            <span className="text-[11px] font-medium text-muted-foreground block">
              Recurring on weekday:
            </span>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => {
                const isSelected = startDayOfWeekIndex === day.dayIndex;
                return (
                  <button
                    key={day.label}
                    type="button"
                    onClick={() => handleSelectWeekday(day.dayIndex)}
                    className={cn(
                      "h-8 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center justify-center",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Yearly: Recurring month & day preview */}
        {intervalUnit === "years" && (
          <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-2 text-xs text-foreground">
            <Calendar className="size-3.5 text-primary" />
            <span>
              Repeats annually every{" "}
              <strong>
                {formatEnglishDayMonth(new Date(startYear, startMonth - 1, startDay))}
              </strong>
            </span>
          </div>
        )}

        {/* Clamping Warning (Only for 29, 30, 31 - NOT for 28) */}
        {isMonthEndClamped && (
          <div className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300">
            <Info className="size-3.5 shrink-0 mt-0.5" />
            <span>
              <strong>Month-end Clamping Active:</strong> Starts on day {startDay}. In
              shorter months (e.g. Feb 28/29 or 30-day months), execution will clamp cleanly to
              month-end, then restore to day {startDay} in subsequent 31-day months.
            </span>
          </div>
        )}
      </div>

      {/* 6. End Conditions Card */}
      <div className="rounded-xl border border-border p-3.5 space-y-2.5">
        <Label className="text-xs font-bold text-foreground">End Condition</Label>

        <div className="space-y-2.5 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="editEndType"
              value="never"
              checked={endType === "never"}
              onChange={() => handleSelectEndType("never")}
              className="accent-primary"
            />
            <span className="font-medium text-foreground">Never (Indefinite schedule)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="editEndType"
              value="count"
              checked={endType === "count"}
              onChange={() => handleSelectEndType("count")}
              className="accent-primary"
            />
            <span className="font-medium text-foreground">After fixed number of occurrences:</span>
          </label>
          {endType === "count" && (
            <div className="ml-6 flex items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                value={totalOccurrencesStr}
                onChange={(e) =>
                  setTotalOccurrencesStr(e.target.value.replace(/[^0-9]/g, ""))
                }
                className="h-8 w-20 text-xs font-bold text-center"
              />
              <span className="text-xs text-muted-foreground">total occurrences</span>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="editEndType"
              value="date"
              checked={endType === "date"}
              onChange={() => handleSelectEndType("date")}
              className="accent-primary"
            />
            <span className="font-medium text-foreground">On specific end date:</span>
          </label>

          {endType === "date" && (
            <div className="ml-6 space-y-2 pt-1">
              {intervalUnit === "months" ? (
                <div className="space-y-1.5">
                  <MonthlyEndPicker
                    startDate={startDate}
                    intervalN={effectiveIntervalN}
                    value={endMonth}
                    onChange={setEndMonth}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Ends on <strong className="text-foreground">{effectiveEndDate}</strong>{" "}
                    (aligned to monthly cycle)
                  </p>
                </div>
              ) : intervalUnit === "years" ? (
                <div className="space-y-1.5">
                  <YearlyEndPicker
                    startDate={startDate}
                    intervalN={effectiveIntervalN}
                    value={parseInt(endYear, 10) || getFirstAllowedYear(startDate, effectiveIntervalN)}
                    onChange={(y) => setEndYear(String(y))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Ends in year <strong className="text-foreground">{endYear}</strong> on{" "}
                    <strong className="text-foreground">{effectiveEndDate}</strong>
                  </p>
                </div>
              ) : intervalUnit === "weeks" ? (
                <div className="space-y-1.5">
                  <WeeklyIphoneClockPicker
                    startDate={startDate}
                    intervalN={effectiveIntervalN}
                    value={endDate}
                    onChange={setEndDate}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <DailyWeeklyEndPicker
                    startDate={startDate}
                    intervalN={effectiveIntervalN}
                    intervalUnit="days"
                    value={endDate}
                    onChange={setEndDate}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Ends on <strong className="text-foreground">{effectiveEndDate}</strong>
                  </p>
                </div>
              )}

              {/* Accessible/Test date input fallback for E2E tests and programmatic changes */}
              <input
                type="date"
                aria-label="End Date"
                value={effectiveEndDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (intervalUnit === "months") {
                    setEndMonth(e.target.value.slice(0, 7));
                  } else if (intervalUnit === "years") {
                    setEndYear(e.target.value.slice(0, 4));
                  }
                }}
                className="sr-only"
                tabIndex={-1}
              />
            </div>
          )}
        </div>
      </div>

      {/* 7. Note */}
      <div className="space-y-1">
        <Label htmlFor="edit-note" className="text-xs font-semibold text-foreground">
          Note / Description
        </Label>
        <Textarea
          id="edit-note"
          placeholder="Optional notes or context for upcoming runs..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="text-xs resize-none"
        />
      </div>

      <DialogFooter className="pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Future Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type EditRuleModalProps = {
  rule: RecurringRule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallets: Wallet[];
  categories: Category[];
  onSave: (ruleId: string, updates: Partial<RecurringRule>) => Promise<void> | void;
};

export function EditRuleModal({
  rule,
  open,
  onOpenChange,
  wallets,
  categories,
  onSave,
}: EditRuleModalProps) {
  if (!rule) return null;

  const handleSave = async (ruleId: string, updates: Partial<RecurringRule>) => {
    await onSave(ruleId, updates);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6 shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Edit3 className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Edit Recurring Transaction
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update parameters for upcoming occurrences.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* US4-5 Future-only edit callout banner */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-foreground flex items-start gap-2.5">
          <ShieldAlert className="size-4 shrink-0 text-primary mt-0.5" />
          <div>
            <p className="font-semibold text-primary">Future-Only Edit & Ledger Preservation</p>
            <p className="mt-0.5 text-muted-foreground text-[11px] leading-relaxed">
              Changes will only apply to future scheduled occurrences. Past recorded transactions remain unchanged.
            </p>
          </div>
        </div>

        <EditRuleForm
          key={rule.id}
          rule={rule}
          wallets={wallets}
          categories={categories}
          onCancel={() => onOpenChange(false)}
          onSave={handleSave}
        />
      </DialogContent>
    </Dialog>
  );
}
