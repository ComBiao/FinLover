"use client";

import { useMemo, useState } from "react";
import { Edit3, Info, ShieldAlert } from "lucide-react";
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
import type { Category } from "@/types/category";
import type { Wallet } from "@/types/wallet";
import { formatCadenceString, parseISODateParts } from "../dateCadence";
import type { EndConditionType, IntervalUnit, RecurringRule } from "../types";

type EditRuleFormProps = {
  rule: RecurringRule;
  wallets: Wallet[];
  categories: Category[];
  onCancel: () => void;
  onSave: (ruleId: string, updates: Partial<RecurringRule>) => void;
};

function EditRuleForm({
  rule,
  wallets,
  categories,
  onCancel,
  onSave,
}: EditRuleFormProps) {
  const [title, setTitle] = useState(rule.title);
  const [amount, setAmount] = useState(String(rule.amount));
  const [walletId, setWalletId] = useState<string | undefined>(rule.walletId);
  const [categoryId, setCategoryId] = useState<string | undefined>(rule.categoryId || undefined);
  const [note, setNote] = useState(rule.note || "");
  const [intervalNStr, setIntervalNStr] = useState(String(rule.intervalN));
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>(rule.intervalUnit);
  const [endType, setEndType] = useState<EndConditionType>(rule.endType);
  const [totalOccurrencesStr, setTotalOccurrencesStr] = useState(String(rule.totalOccurrences || 6));
  const [endDate, setEndDate] = useState<string>(rule.endDate || "");
  const [endMonth, setEndMonth] = useState<string>(rule.endDate ? rule.endDate.slice(0, 7) : "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [, , startDay] = parseISODateParts(rule.startDate);

  const effectiveEndDate = useMemo(() => {
    if (endType !== "date") return "";
    if (intervalUnit === "months") {
      if (!endMonth) return "";
      const [ey, em] = endMonth.split("-").map(Number);
      const daysInEndMonth = new Date(ey, em, 0).getDate();
      const clampedEndDay = Math.min(startDay, daysInEndMonth);
      return `${ey}-${String(em).padStart(2, "0")}-${String(clampedEndDay).padStart(2, "0")}`;
    }
    return endDate;
  }, [endType, intervalUnit, endMonth, endDate, startDay]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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
      if (effectiveEndDate <= rule.startDate) {
        setErrorMessage("End date must be strictly after the start date");
        return;
      }
    }

    onSave(rule.id, {
      title: title.trim(),
      amount: numAmount,
      walletId,
      categoryId: categoryId || null,
      note: note.trim() || undefined,
      intervalN: n,
      intervalUnit,
      endType,
      totalOccurrences: endType === "count" ? parseInt(totalOccurrencesStr, 10) : undefined,
      endDate: endType === "date" ? effectiveEndDate : undefined,
    });
  };

  const cadencePreview = formatCadenceString({
    intervalN: parseInt(intervalNStr, 10) || 1,
    intervalUnit,
    startDate: rule.startDate,
    anchorDay: rule.anchorDay,
  });

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4 pt-1">
      {errorMessage && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="edit-title" className="text-xs font-semibold">Title *</Label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 text-xs"
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="edit-amount" className="text-xs font-semibold">Future Amount (฿) *</Label>
          <Input
            id="edit-amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-9 text-xs font-mono font-bold"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Target Wallet *</Label>
          <WalletSelector
            value={walletId}
            onValueChange={(val) => setWalletId(val)}
            wallets={wallets}
            placeholder="Choose wallet"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Category</Label>
          <CategorySelector
            type={rule.type}
            value={categoryId}
            onValueChange={(cat) => setCategoryId(cat)}
            categories={categories}
            placeholder="Category"
          />
        </div>
      </div>

      {/* Cadence */}
      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">Cadence Preview:</span>
          <span className="font-semibold text-primary">{cadencePreview}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground">Every:</span>
            <Input
              id="edit-interval-count"
              type="text"
              inputMode="numeric"
              value={intervalNStr}
              onChange={(e) => setIntervalNStr(e.target.value.replace(/[^0-9]/g, ""))}
              onBlur={() => {
                if (!intervalNStr || parseInt(intervalNStr, 10) <= 0) setIntervalNStr("1");
              }}
              className="h-8 text-xs font-semibold text-center"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground">Frequency Unit:</span>
            <Select
              value={intervalUnit}
              onValueChange={(v) => setIntervalUnit(v as IntervalUnit)}
            >
              <SelectTrigger className="h-8 text-xs">
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

        {/* Clamping Warning (Only for 29, 30, 31 - NOT for 28) */}
        {(intervalUnit === "months" || intervalUnit === "years") && startDay >= 29 && (
          <div className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300">
            <Info className="size-3.5 shrink-0 mt-0.5" />
            <span>
              <strong>Month-end Clamping Active:</strong> Starts on day {startDay}. In shorter months (e.g. Feb 28/29 or 30-day months), execution will clamp cleanly to month-end, then restore to day {startDay} in subsequent 31-day months.
            </span>
          </div>
        )}
      </div>

      {/* End Conditions */}
      <div className="space-y-2 rounded-xl border border-border p-3">
        <Label className="text-xs font-bold text-foreground">End Condition</Label>

        <div className="space-y-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="editEndType"
              value="never"
              checked={endType === "never"}
              onChange={() => setEndType("never")}
              className="accent-primary"
            />
            <span className="font-medium text-foreground">Never (Indefinite)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="editEndType"
              value="count"
              checked={endType === "count"}
              onChange={() => setEndType("count")}
              className="accent-primary"
            />
            <span className="font-medium text-foreground">After N occurrences:</span>
          </label>
          {endType === "count" && (
            <div className="ml-6 flex items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                value={totalOccurrencesStr}
                onChange={(e) => setTotalOccurrencesStr(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={() => {
                  if (!totalOccurrencesStr || parseInt(totalOccurrencesStr, 10) <= 0) {
                    setTotalOccurrencesStr("1");
                  }
                }}
                className="h-8 w-20 text-xs font-semibold text-center"
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
              onChange={() => setEndType("date")}
              className="accent-primary"
            />
            <span className="font-medium text-foreground">On specific date:</span>
          </label>
          {endType === "date" && (
            <div className="ml-6 space-y-1">
              {intervalUnit === "months" ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="month"
                    min={rule.startDate.slice(0, 7)}
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    className="h-8 w-40 text-xs font-mono"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Ends on {effectiveEndDate}
                  </span>
                </div>
              ) : (
                <Input
                  type="date"
                  min={rule.startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 w-40 text-xs font-mono"
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="edit-note" className="text-xs font-semibold">Note</Label>
        <Textarea
          id="edit-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="text-xs"
        />
      </div>

      <DialogFooter className="pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit">
          Save Future Changes
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
  onSave: (ruleId: string, updates: Partial<RecurringRule>) => void;
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

  const handleSave = (ruleId: string, updates: Partial<RecurringRule>) => {
    onSave(ruleId, updates);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6 shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Edit3 className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Edit Recurring Transaction</DialogTitle>
              <DialogDescription className="text-xs">
                Update parameters for upcoming occurrences.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* US4-5 Future-only edit callout banner */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-foreground flex items-start gap-2.5">
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
