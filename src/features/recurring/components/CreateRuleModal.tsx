"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Info,
  Repeat,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { WalletSelector } from "@/components/WalletSelector";
import { CategorySelector } from "@/components/CategorySelector";
import { isFallbackCategory } from "@/features/categories/categoriesService";
import { cn, formatEnglishDayMonth, todayISODate, toLocalISODate } from "@/lib/utils";
import type { Category, TransactionType } from "@/types/category";
import type { Wallet } from "@/types/wallet";
import { formatCadenceString, getWeekdayClosestToDate, parseISODateParts } from "../dateCadence";
import type { EndConditionType, IntervalUnit, RecurringRule } from "../types";

type CreateRuleModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallets: Wallet[];
  categories: Category[];
  authorAttribution: string;
  onCreateRule: (
    rule: Omit<RecurringRule, "id" | "createdAt" | "updatedAt" | "postedCount">
  ) => Promise<void> | void;
};

const WEEKDAYS = [
  { label: "Mon", dayIndex: 1 },
  { label: "Tue", dayIndex: 2 },
  { label: "Wed", dayIndex: 3 },
  { label: "Thu", dayIndex: 4 },
  { label: "Fri", dayIndex: 5 },
  { label: "Sat", dayIndex: 6 },
  { label: "Sun", dayIndex: 0 },
];

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function snapDateToMatchingWeekday(dateStr: string, targetDayIndex: number): string {
  const [y, m, d] = parseISODateParts(dateStr);
  const date = new Date(y, m - 1, d);
  const currentDay = date.getDay();
  let diff = targetDayIndex - currentDay;
  if (diff < 0) diff += 7;
  date.setDate(date.getDate() + diff);
  return toLocalISODate(date);
}

export function CreateRuleModal({
  open,
  onOpenChange,
  wallets,
  categories,
  authorAttribution,
  onCreateRule,
}: CreateRuleModalProps) {
  const today = todayISODate();
  const [type, setType] = useState<TransactionType>("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState<string | undefined>(wallets[0]?.id);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [note, setNote] = useState("");

  // Cadence
  const [intervalNStr, setIntervalNStr] = useState("1");
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>("months");
  const [startDate, setStartDate] = useState(today);

  // End Condition
  const [endType, setEndType] = useState<EndConditionType>("never");
  const [totalOccurrencesStr, setTotalOccurrencesStr] = useState("6");
  const [endDate, setEndDate] = useState(() => {
    const [y, m, d] = parseISODateParts(today);
    const dObj = new Date(y, m - 1, d);
    dObj.setDate(dObj.getDate() + 28);
    const ey = dObj.getFullYear();
    const em = String(dObj.getMonth() + 1).padStart(2, "0");
    const ed = String(dObj.getDate()).padStart(2, "0");
    return `${ey}-${em}-${ed}`;
  });
  const [endMonth, setEndMonth] = useState(() => {
    const [y, m] = parseISODateParts(today);
    const nextYear = m >= 7 ? y + 1 : y;
    const nextMonth = m >= 7 ? m - 6 : m + 6;
    return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
  });
  const [endYear, setEndYear] = useState(() => {
    const [y] = parseISODateParts(today);
    return String(y + 1);
  });

  // Flags
  const [isShared, setIsShared] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Find fallback "Others" category for current type
  const fallbackCategory = useMemo(() => {
    return (
      categories.find((c) => c.type === type && isFallbackCategory(c)) ||
      categories.find(
        (c) =>
          c.type === type &&
          (c.name.toLowerCase() === "others" || c.name.toLowerCase() === "other")
      ) ||
      categories.find((c) => c.type === type)
    );
  }, [categories, type]);

  // Derived effective category id ensuring default to "Others"
  const effectiveCategoryId = useMemo(() => {
    if (categoryId && categories.some((c) => c.id === categoryId && c.type === type)) {
      return categoryId;
    }
    return fallbackCategory?.id;
  }, [categoryId, categories, type, fallbackCategory]);

  // Weekday calculations for weekly interval
  const startDayOfWeekIndex = useMemo(() => {
    if (!startDate) return 0;
    const [y, m, d] = parseISODateParts(startDate);
    return new Date(y, m - 1, d).getDay();
  }, [startDate]);

  const startDayOfWeekName = WEEKDAY_NAMES[startDayOfWeekIndex];

  // Cadence preview
  const [, , startDay] = parseISODateParts(startDate || today);
  const effectiveIntervalN = Math.max(1, parseInt(intervalNStr, 10) || 1);
  const cadencePreview = formatCadenceString({
    intervalN: effectiveIntervalN,
    intervalUnit,
    startDate: startDate || today,
    anchorDay: startDay,
  });

  // Clamping alert: Only for days 29, 30, and 31 (NOT for day 28)
  const isMonthEndClamped = intervalUnit === "months" && startDay >= 29;

  // Compute effective end date when Monthly (from endMonth) or Yearly (from endYear)
  const effectiveEndDate = useMemo(() => {
    if (endType !== "date") return "";
    if (intervalUnit === "months") {
      if (!endMonth) return "";
      const [ey, em] = endMonth.split("-").map(Number);
      const daysInEndMonth = new Date(ey, em, 0).getDate();
      const clampedEndDay = Math.min(startDay, daysInEndMonth);
      return `${ey}-${String(em).padStart(2, "0")}-${String(clampedEndDay).padStart(2, "0")}`;
    }
    if (intervalUnit === "years") {
      if (!endYear) return "";
      const ey = parseInt(endYear, 10);
      if (isNaN(ey)) return "";
      const [, sm, sd] = parseISODateParts(startDate);
      const daysInMonth = new Date(ey, sm, 0).getDate();
      const clampedDay = Math.min(sd, daysInMonth);
      return `${ey}-${String(sm).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
    }
    return endDate;
  }, [endType, intervalUnit, endMonth, endYear, endDate, startDay, startDate]);

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const nextFallback =
      categories.find((c) => c.type === nextType && isFallbackCategory(c)) ||
      categories.find(
        (c) =>
          c.type === nextType &&
          (c.name.toLowerCase() === "others" || c.name.toLowerCase() === "other")
      ) ||
      categories.find((c) => c.type === nextType);
    setCategoryId(nextFallback?.id);
  };

  const handleSelectWeekday = (dayIndex: number) => {
    const nextDate = getWeekdayClosestToDate(dayIndex, startDate, today);
    setStartDate(nextDate);
    if (endDate && intervalUnit === "weeks") {
      setEndDate(snapDateToMatchingWeekday(endDate, dayIndex));
    }
  };

  const handleUnitChange = (nextUnit: IntervalUnit) => {
    setIntervalUnit(nextUnit);
    if (nextUnit === "weeks" && endDate) {
      setEndDate(snapDateToMatchingWeekday(endDate, startDayOfWeekIndex));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Please enter a title or subscription name");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage("Amount must be greater than ฿0");
      return;
    }

    if (!walletId) {
      setErrorMessage("Please select a target wallet");
      return;
    }

    if (!startDate) {
      setErrorMessage("Please specify a start date");
      return;
    }

    // Start date must be in future (or today)
    if (startDate < today) {
      setErrorMessage("Start date cannot be in the past");
      return;
    }

    // Frequency bounds: 1–365 Days, 1–52 Weeks, 1–60 Months, 1–5 Years
    if (!intervalNStr.trim()) {
      setErrorMessage("Please enter a frequency interval");
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
      if (!totalOccurrencesStr.trim()) {
        setErrorMessage("Please enter the number of occurrences");
        return;
      }
      const occurrences = parseInt(totalOccurrencesStr, 10);
      if (isNaN(occurrences) || occurrences <= 0) {
        setErrorMessage("Total occurrences must be at least 1");
        return;
      }
    }

    if (endType === "date") {
      if (!effectiveEndDate) {
        setErrorMessage(
          intervalUnit === "months"
            ? "Please select an end month"
            : intervalUnit === "years"
            ? "Please enter an end year"
            : "Please choose an end date"
        );
        return;
      }
      if (effectiveEndDate <= startDate) {
        setErrorMessage(
          intervalUnit === "years"
            ? "End year must be strictly after the start year"
            : "End date must be strictly after the start date"
        );
        return;
      }
      // For weekly: enforce weekday match
      if (intervalUnit === "weeks") {
        const [ey, em, ed] = parseISODateParts(effectiveEndDate);
        const endDayIndex = new Date(ey, em - 1, ed).getDay();
        if (endDayIndex !== startDayOfWeekIndex) {
          setErrorMessage(
            `End date must fall on a ${startDayOfWeekName} to match weekly schedule`
          );
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      await onCreateRule({
        title: title.trim(),
        amount: numAmount,
        type,
        walletId,
        categoryId: effectiveCategoryId || null,
        note: note.trim() || undefined,
        intervalN: n,
        intervalUnit,
        anchorDay: startDay,
        startDate,
        nextRunDate: startDate,
        endType,
        totalOccurrences:
          endType === "count" ? parseInt(totalOccurrencesStr, 10) : undefined,
        endDate: endType === "date" ? effectiveEndDate : undefined,
        status: "active",
        isShared,
        authorName: authorAttribution,
        authorRole: "owner",
      });
      onOpenChange(false);
      // Reset form
      setTitle("");
      setAmount("");
      setNote("");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create recurring rule");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border-t-[6px] p-5 sm:p-6 shadow-xl transition-all",
          type === "expense" ? "border-t-destructive" : "border-t-success"
        )}
      >
        <DialogHeader className="pb-1">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-full shrink-0",
                type === "expense"
                  ? "bg-danger-bg text-destructive"
                  : "bg-success-bg text-success"
              )}
            >
              {type === "expense" ? (
                <ArrowDownRight className="size-5" />
              ) : (
                <ArrowUpRight className="size-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {type === "expense"
                  ? "New Recurring Expense"
                  : "New Recurring Income"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set up automated scheduled commitments with custom frequency.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit} className="space-y-4 pt-1">
          {errorMessage && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs font-semibold text-destructive">
              {errorMessage}
            </div>
          )}

          {/* Top-to-Bottom Flow */}

          {/* 1. Type: Separate side-by-side buttons without an outer container box */}
          <div
            role="radiogroup"
            aria-label="Transaction type"
            className="grid grid-cols-2 gap-3"
          >
            <button
              type="button"
              role="radio"
              aria-checked={type === "expense"}
              onClick={() => handleTypeChange("expense")}
              className={cn(
                "flex h-12 items-center justify-center gap-2.5 rounded-xl text-base sm:text-lg font-extrabold transition-all cursor-pointer border",
                type === "expense"
                  ? "bg-destructive text-destructive-foreground border-destructive shadow-md ring-2 ring-destructive/30"
                  : "bg-danger-bg/40 text-destructive border-destructive/30 hover:bg-danger-bg/70 hover:border-destructive/50"
              )}
            >
              <ArrowDownRight className="size-5" />
              Expense
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={type === "income"}
              onClick={() => handleTypeChange("income")}
              className={cn(
                "flex h-12 items-center justify-center gap-2.5 rounded-xl text-base sm:text-lg font-extrabold transition-all cursor-pointer border",
                type === "income"
                  ? "bg-success text-white border-success shadow-md ring-2 ring-success/30"
                  : "bg-success-bg/40 text-success border-success/30 hover:bg-success-bg/70 hover:border-success/50"
              )}
            >
              <ArrowUpRight className="size-5" />
              Income
            </button>
          </div>

          {/* 2. Title */}
          <div className="space-y-1">
            <Label htmlFor="rule-title" className="text-xs font-semibold text-foreground">
              Title / Subscription Name *
            </Label>
            <Input
              id="rule-title"
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
          </div>

          {/* 3. Amount */}
          <div className="space-y-1">
            <Label htmlFor="rule-amount" className="text-xs font-semibold text-foreground">
              Amount (฿) *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm font-bold text-muted-foreground">
                ฿
              </span>
              <Input
                id="rule-amount"
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
          </div>

          {/* 4. Target Wallet & Category in a 2-column row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Target Wallet *</Label>
              <WalletSelector
                value={walletId}
                onValueChange={(val) => setWalletId(val)}
                wallets={wallets}
                placeholder="Choose wallet"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Category</Label>
              <CategorySelector
                type={type}
                value={effectiveCategoryId}
                onValueChange={(cat) => setCategoryId(cat)}
                categories={categories}
                placeholder="Category"
              />
            </div>
          </div>

          {/* 5. Custom Frequency Card (US4-1) */}
          <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Repeat className="size-3.5 text-primary" />
                <Label className="text-xs font-bold text-foreground">
                  Custom Frequency & Interval (US4-1)
                </Label>
              </div>
              <span className="text-xs font-bold text-primary">{cadencePreview}</span>
            </div>

            {/* Interval Number & Unit & Start Date in 3 columns */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">Every:</span>
                <Input
                  id="interval-count"
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

              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">Start Date:</span>
                <Input
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 font-mono text-xs"
                />
              </div>
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
                  Repeats annually every <strong>{formatEnglishDayMonth(new Date(parseISODateParts(startDate)[0], parseISODateParts(startDate)[1] - 1, parseISODateParts(startDate)[2]))}</strong>
                </span>
              </div>
            )}

            {/* Clamping Warning (Only for 29, 30, 31 - NOT for 28) */}
            {isMonthEndClamped && (
              <div className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300">
                <Info className="size-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong>Month-end Clamping Active:</strong> Starts on day {startDay}. In shorter months (e.g. Feb 28/29 or 30-day months), execution will clamp cleanly to month-end, then restore to day {startDay} in subsequent 31-day months.
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
                  name="endType"
                  value="never"
                  checked={endType === "never"}
                  onChange={() => setEndType("never")}
                  className="accent-primary"
                />
                <span className="font-medium text-foreground">Never (Indefinite schedule)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="endType"
                  value="count"
                  checked={endType === "count"}
                  onChange={() => setEndType("count")}
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
                  name="endType"
                  value="date"
                  checked={endType === "date"}
                  onChange={() => setEndType("date")}
                  className="accent-primary"
                />
                <span className="font-medium text-foreground">On specific end date:</span>
              </label>

              {endType === "date" && (
                <div className="ml-6 space-y-1.5 pt-0.5">
                  {intervalUnit === "months" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="month"
                        min={startDate.slice(0, 7)}
                        value={endMonth}
                        onChange={(e) => setEndMonth(e.target.value)}
                        className="h-8 w-40 text-xs font-mono"
                      />
                      <span className="text-[11px] text-muted-foreground">
                        Ends on <strong>{effectiveEndDate}</strong> (aligned to monthly cycle)
                      </span>
                    </div>
                  ) : intervalUnit === "years" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        min={parseISODateParts(startDate)[0] + 1}
                        max={parseISODateParts(startDate)[0] + 50}
                        value={endYear}
                        onChange={(e) => setEndYear(e.target.value.replace(/[^0-9]/g, ""))}
                        className="h-8 w-24 text-xs font-mono text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[11px] text-muted-foreground">
                        Ends in year <strong>{endYear}</strong> on <strong>{effectiveEndDate}</strong>
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="date"
                        min={startDate}
                        value={endDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (intervalUnit === "weeks" && val) {
                            setEndDate(snapDateToMatchingWeekday(val, startDayOfWeekIndex));
                          } else {
                            setEndDate(val);
                          }
                        }}
                        className="h-8 w-40 text-xs font-mono"
                      />
                      {intervalUnit === "weeks" && (
                        <span className="text-[11px] text-muted-foreground">
                          (Must end on a {startDayOfWeekName})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 7. Note */}
          <div className="space-y-1">
            <Label htmlFor="rule-note" className="text-xs font-semibold text-foreground">
              Note (Optional)
            </Label>
            <Textarea
              id="rule-note"
              placeholder="e.g. Shared split with roommates, 50% reimbursed"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="text-xs"
            />
          </div>

          {/* 8. Flags & Checkboxes */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-shared"
                checked={isShared}
                onCheckedChange={(checked) => setIsShared(Boolean(checked))}
              />
              <label
                htmlFor="is-shared"
                className="text-xs font-medium leading-none text-foreground cursor-pointer flex items-center gap-1.5"
              >
                <Users className="size-3.5 text-muted-foreground" />
                Simulate Shared Wallet rule (Logged by {authorAttribution})
              </label>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Save Recurring Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
