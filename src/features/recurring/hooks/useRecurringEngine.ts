"use client";

import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useCreateTransaction } from "@/features/transactions/hooks/useTransactionMutations";
import { useWallets } from "@/features/wallets/hooks/useWallets";
import { useCurrentUser, displayName } from "@/features/auth/hooks/useCurrentUser";
import { formatBaht, toLocalISODate } from "@/lib/utils";
import {
  computeOccurrenceDate,
  getResumeNextRunDate,
  parseISODateParts,
} from "../dateCadence";
import { useRecurringRules } from "../store/useRecurringRules";
import type { RecurringRule, SimulationLogEntry } from "../types";

/** Parses YYYY-MM-DD as local date */
function parseLocalISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function useRecurringEngine() {
  const { data: wallets = [] } = useWallets();
  const { data: categories = [] } = useCategories();
  const { data: currentUser } = useCurrentUser();
  const createTransactionMutation = useCreateTransaction();

  const rules = useRecurringRules((s) => s.rules);
  const simulatedDate = useRecurringRules((s) => s.simulatedDate);
  const logs = useRecurringRules((s) => s.logs);
  const selectedRuleIdForLedger = useRecurringRules((s) => s.selectedRuleIdForLedger);
  const hasHydrated = useRecurringRules((s) => s.hasHydrated);

  const setSimulatedDate = useRecurringRules((s) => s.setSimulatedDate);
  const addRule = useRecurringRules((s) => s.addRule);
  const updateRule = useRecurringRules((s) => s.updateRule);
  const deleteRule = useRecurringRules((s) => s.deleteRule);
  const pauseRule = useRecurringRules((s) => s.pauseRule);
  const resumeRule = useRecurringRules((s) => s.resumeRule);
  const recordOccurrenceExecution = useRecurringRules((s) => s.recordOccurrenceExecution);
  const addLog = useRecurringRules((s) => s.addLog);
  const clearLogs = useRecurringRules((s) => s.clearLogs);
  const setSelectedRuleIdForLedger = useRecurringRules((s) => s.setSelectedRuleIdForLedger);
  const resetTestData = useRecurringRules((s) => s.resetTestData);
  const reconcileWithWallets = useRecurringRules((s) => s.reconcileWithWallets);

  // Sync wallet IDs if needed
  useEffect(() => {
    if (hasHydrated && wallets.length > 0) {
      reconcileWithWallets(wallets);
    }
  }, [hasHydrated, wallets, reconcileWithWallets]);

  const authorAttribution = displayName(currentUser) || "Alex Demo";

  /**
   * Posts a single occurrence for a given rule on scheduledDate.
   */
  const postOccurrence = useCallback(
    async (
      rule: RecurringRule,
      scheduledDate: string,
      occurrenceNum: number
    ): Promise<string | null> => {
      // Tag recurring in note
      const tag = `[Recurring: ${rule.id} #${occurrenceNum}]`;
      const combinedNote = rule.note ? `${rule.note} · ${tag}` : tag;

      try {
        const created = await createTransactionMutation.mutateAsync({
          title: rule.title,
          amount: rule.amount,
          type: rule.type,
          walletId: rule.walletId,
          categoryId: rule.categoryId ?? undefined,
          date: parseLocalISODate(scheduledDate),
          note: combinedNote,
        });
        return created.id;
      } catch (err) {
        console.error("Failed to post recurring transaction:", err);
        return null;
      }
    },
    [createTransactionMutation]
  );

  /**
   * Force trigger next occurrence for a specific rule right now.
   */
  const triggerRuleNow = useCallback(
    async (ruleId: string) => {
      const rule = rules.find((r) => r.id === ruleId);
      if (!rule) return;

      const scheduledDate = rule.nextRunDate || simulatedDate;
      const occurrenceNum = rule.postedCount + 1;
      const targetWallet = wallets.find((w) => w.id === rule.walletId);
      const walletName = targetWallet?.name ?? "Wallet";

      const txId = await postOccurrence(rule, scheduledDate, occurrenceNum);
      if (!txId) {
        toast.error(`Failed to post transaction for "${rule.title}"`);
        return;
      }

      // Compute next date
      const anchor = rule.anchorDay ?? parseISODateParts(rule.startDate)[2];
      const nextDate = computeOccurrenceDate(
        rule.startDate,
        anchor,
        rule.intervalN,
        rule.intervalUnit,
        occurrenceNum
      );

      const isCompleted =
        (rule.endType === "count" && rule.totalOccurrences != null && occurrenceNum >= rule.totalOccurrences) ||
        (rule.endType === "date" && rule.endDate != null && nextDate > rule.endDate);

      const log: SimulationLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        simulatedDate: scheduledDate,
        ruleId: rule.id,
        ruleTitle: rule.title,
        transactionId: txId,
        amount: rule.amount,
        type: rule.type,
        walletName,
        occurrenceNumber: occurrenceNum,
        action: "posted",
        message: `Manually triggered occurrence #${occurrenceNum} for "${rule.title}" (${formatBaht(rule.amount, { sign: true })}) on ${walletName}. Next run: ${nextDate}`,
      };

      recordOccurrenceExecution(rule.id, nextDate, isCompleted, log);
      toast.success(
        `Posted occurrence #${occurrenceNum} for "${rule.title}" (${formatBaht(rule.amount, { sign: true })})`
      );
    },
    [rules, simulatedDate, wallets, postOccurrence, recordOccurrenceExecution]
  );

  /**
   * Simulates processing all active rules due on or before `targetDateISO`.
   * Fast-forwards time and runs catch-up if targetDateISO > simulatedDate.
   */
  const processDueRules = useCallback(
    async (targetDateISO: string = simulatedDate) => {
      let totalPosted = 0;
      let rulesCompleted = 0;

      // Filter active rules
      const activeRules = rules.filter((r) => r.status === "active");

      for (const rule of activeRules) {
        let currentCount = rule.postedCount;
        let nextDate = rule.nextRunDate;
        const anchor = rule.anchorDay ?? parseISODateParts(rule.startDate)[2];
        let ruleCompleted = false;

        while (nextDate <= targetDateISO) {
          // Check count limit
          if (rule.endType === "count" && rule.totalOccurrences != null && currentCount >= rule.totalOccurrences) {
            ruleCompleted = true;
            break;
          }
          // Check date limit
          if (rule.endType === "date" && rule.endDate != null && nextDate > rule.endDate) {
            ruleCompleted = true;
            break;
          }

          currentCount++;
          const targetWallet = wallets.find((w) => w.id === rule.walletId);
          const walletName = targetWallet?.name ?? "Wallet";

          // Execute post
          const txId = await postOccurrence(rule, nextDate, currentCount);
          totalPosted++;

          // Check if completion reached
          if (rule.endType === "count" && rule.totalOccurrences != null && currentCount >= rule.totalOccurrences) {
            ruleCompleted = true;
          }

          // Advance next date
          const upcomingDate = computeOccurrenceDate(
            rule.startDate,
            anchor,
            rule.intervalN,
            rule.intervalUnit,
            currentCount
          );

          if (rule.endType === "date" && rule.endDate != null && upcomingDate > rule.endDate) {
            ruleCompleted = true;
          }

          const log: SimulationLogEntry = {
            id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toLocaleTimeString(),
            simulatedDate: nextDate,
            ruleId: rule.id,
            ruleTitle: rule.title,
            transactionId: txId ?? undefined,
            amount: rule.amount,
            type: rule.type,
            walletName,
            occurrenceNumber: currentCount,
            action: ruleCompleted ? "completed" : "posted",
            message: `Posted occurrence #${currentCount} for "${rule.title}" (${formatBaht(rule.amount, { sign: true })}) on ${walletName}.${
              ruleCompleted ? " Rule reached end condition and is now Completed." : ` Next: ${upcomingDate}`
            }`,
          };

          recordOccurrenceExecution(rule.id, upcomingDate, ruleCompleted, log);
          nextDate = upcomingDate;

          if (ruleCompleted) {
            rulesCompleted++;
            break;
          }
        }
      }

      setSimulatedDate(targetDateISO);

      if (totalPosted === 0) {
        toast.info(`No active rules due on or before ${targetDateISO}.`);
      } else {
        toast.success(
          `Processed due run: ${totalPosted} transaction${
            totalPosted > 1 ? "s" : ""
          } generated${rulesCompleted > 0 ? `, ${rulesCompleted} rule(s) completed` : ""}.`
        );
      }

      return { totalPosted, rulesCompleted };
    },
    [rules, simulatedDate, wallets, postOccurrence, recordOccurrenceExecution, setSimulatedDate]
  );

  /**
   * Resumes an overdue rule advancing to next upcoming cycle without retroactive double posting (US4-4).
   */
  const handleResumeRule = useCallback(
    (ruleId: string) => {
      const rule = rules.find((r) => r.id === ruleId);
      if (!rule) return;

      const { nextRunDate, skippedCycles } = getResumeNextRunDate(rule, simulatedDate);
      resumeRule(rule.id, nextRunDate);

      const targetWallet = wallets.find((w) => w.id === rule.walletId);
      const walletName = targetWallet?.name ?? "Wallet";

      const log: SimulationLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        simulatedDate,
        ruleId: rule.id,
        ruleTitle: rule.title,
        amount: rule.amount,
        type: rule.type,
        walletName,
        occurrenceNumber: rule.postedCount,
        action: "resumed",
        message: `Resumed rule "${rule.title}". ${
          skippedCycles > 0
            ? `Advanced next run to ${nextRunDate} (skipped ${skippedCycles} overdue cycles without retroactive posting).`
            : `Next run scheduled for ${nextRunDate}.`
        }`,
      };

      addLog(log);

      if (skippedCycles > 0) {
        toast.success(
          `Resumed "${rule.title}". Advanced to ${nextRunDate} (${skippedCycles} past cycles skipped).`
        );
      } else {
        toast.success(`Resumed "${rule.title}". Next run: ${nextRunDate}`);
      }
    },
    [rules, simulatedDate, resumeRule, wallets, addLog]
  );

  /**
   * Pauses an active rule (US4-4).
   */
  const handlePauseRule = useCallback(
    (ruleId: string) => {
      const rule = rules.find((r) => r.id === ruleId);
      if (!rule) return;

      pauseRule(rule.id);

      const targetWallet = wallets.find((w) => w.id === rule.walletId);
      const walletName = targetWallet?.name ?? "Wallet";

      const log: SimulationLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        simulatedDate,
        ruleId: rule.id,
        ruleTitle: rule.title,
        amount: rule.amount,
        type: rule.type,
        walletName,
        occurrenceNumber: rule.postedCount,
        action: "paused",
        message: `Paused recurring rule "${rule.title}". Future scheduled postings halted.`,
      };

      addLog(log);
      toast.info(`Paused "${rule.title}". Future postings halted.`);
    },
    [rules, pauseRule, simulatedDate, wallets, addLog]
  );

  /**
   * Fast forwards time by N days/weeks/months/years and optionally executes catchup.
   */
  const fastForwardTime = useCallback(
    async (
      amount: number,
      unit: "days" | "weeks" | "months" | "years",
      autoExecuteCatchup: boolean = true
    ) => {
      const [y, m, d] = parseISODateParts(simulatedDate);
      const date = new Date(y, m - 1, d);

      if (unit === "days") {
        date.setDate(date.getDate() + amount);
      } else if (unit === "weeks") {
        date.setDate(date.getDate() + amount * 7);
      } else if (unit === "months") {
        const totalMonths = m - 1 + amount;
        const targetYear = y + Math.floor(totalMonths / 12);
        const targetMonth = ((totalMonths % 12) + 12) % 12;
        const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
        date.setFullYear(targetYear);
        date.setMonth(targetMonth);
        date.setDate(Math.min(d, maxDays));
      } else if (unit === "years") {
        date.setFullYear(date.getFullYear() + amount);
      }

      const newDateISO = toLocalISODate(date);

      if (autoExecuteCatchup) {
        await processDueRules(newDateISO);
      } else {
        setSimulatedDate(newDateISO);
        toast.info(`Simulated date advanced to ${newDateISO}`);
      }
    },
    [simulatedDate, processDueRules, setSimulatedDate]
  );

  return {
    rules,
    simulatedDate,
    logs,
    selectedRuleIdForLedger,
    hasHydrated,
    authorAttribution,
    wallets,
    categories,
    // Actions
    setSimulatedDate,
    addRule,
    updateRule,
    deleteRule,
    pauseRule: handlePauseRule,
    resumeRule: handleResumeRule,
    triggerRuleNow,
    processDueRules,
    fastForwardTime,
    clearLogs,
    setSelectedRuleIdForLedger,
    resetTestData: () => resetTestData(wallets, categories),
    postOccurrence,
  };
}

