import { create } from "zustand";
import { persist } from "zustand/middleware";
import { todayISODate } from "@/lib/utils";
import type { Category } from "@/types/category";
import type { Wallet } from "@/types/wallet";
import {
  parseISODateParts,
} from "../dateCadence";
import type { RecurringRule, SimulationLogEntry } from "../types";

export function createDefaultSeedRules(wallets: Wallet[] = [], categories: Category[] = []): RecurringRule[] {
  const mainBank = wallets.find((w) => w.name.toLowerCase().includes("bank")) || wallets[0];
  const cashWallet = wallets.find((w) => w.name.toLowerCase().includes("cash")) || wallets[1] || wallets[0];

  const mainBankId = mainBank?.id ?? "wallet-main-bank";
  const cashWalletId = cashWallet?.id ?? "wallet-cash";

  const salaryCat = categories.find((c) => c.name.toLowerCase().includes("salary") && c.type === "income");
  const foodCat = categories.find((c) => c.name.toLowerCase().includes("food"));
  const utilCat = categories.find((c) => c.name.toLowerCase().includes("util"));

  const today = todayISODate(); // e.g. 2026-10-23
  const [year, month] = parseISODateParts(today);
  const currentMonthPrefix = `${year}-${String(month).padStart(2, "0")}`;

  return [
    {
      id: "seed-rule-salary",
      title: "Monthly Salary (Direct Deposit)",
      amount: 30000,
      type: "income",
      walletId: mainBankId,
      categoryId: salaryCat?.id ?? null,
      note: "Primary monthly corporate salary",
      intervalN: 1,
      intervalUnit: "months",
      anchorDay: 25,
      startDate: "2026-08-25",
      nextRunDate: `${currentMonthPrefix}-25`,
      lastRunDate: "2026-09-25",
      endType: "never",
      postedCount: 2,
      status: "active",
      authorName: "Alex Demo",
      authorRole: "owner",
      createdAt: "2026-08-01T08:00:00.000Z",
      updatedAt: "2026-08-01T08:00:00.000Z",
    },
    {
      id: "seed-rule-netflix",
      title: "Netflix 4K Premium Plan",
      amount: 419,
      type: "expense",
      walletId: mainBankId,
      categoryId: utilCat?.id ?? null,
      note: "Family 4K plan subscription",
      intervalN: 1,
      intervalUnit: "months",
      anchorDay: 23,
      startDate: "2026-08-23",
      nextRunDate: today, // Due today! Great for testing "Simulate Today's Due Run"
      lastRunDate: "2026-09-23",
      endType: "never",
      postedCount: 2,
      status: "active",
      authorName: "Alex Demo",
      authorRole: "owner",
      createdAt: "2026-08-01T09:00:00.000Z",
      updatedAt: "2026-08-01T09:00:00.000Z",
    },
    {
      id: "seed-rule-gym",
      title: "Fitness First 6-Month Pass",
      amount: 1800,
      type: "expense",
      walletId: mainBankId,
      categoryId: null,
      note: "Fixed duration fitness membership",
      intervalN: 1,
      intervalUnit: "months",
      anchorDay: 5,
      startDate: "2026-07-05",
      nextRunDate: `${currentMonthPrefix}-05`,
      lastRunDate: "2026-09-05",
      endType: "count",
      totalOccurrences: 6,
      postedCount: 3, // 3 of 6 posted
      status: "active",
      authorName: "Alex Demo",
      authorRole: "owner",
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-01T10:00:00.000Z",
    },
    {
      id: "seed-rule-shared-rent",
      title: "Condo Co-Living Rent & Wifi",
      amount: 6500,
      type: "expense",
      walletId: mainBankId,
      categoryId: utilCat?.id ?? null,
      note: "Shared condo rent contribution",
      intervalN: 1,
      intervalUnit: "months",
      anchorDay: 1,
      startDate: "2026-08-01",
      nextRunDate: `${currentMonthPrefix}-01`,
      lastRunDate: "2026-09-01",
      endType: "never",
      postedCount: 2,
      status: "active",
      isShared: true,
      authorName: "Alex Demo",
      authorRole: "owner",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
    {
      id: "seed-rule-farmers-market",
      title: "Bi-Weekly Fresh Groceries",
      amount: 750,
      type: "expense",
      walletId: cashWalletId,
      categoryId: foodCat?.id ?? null,
      note: "Weekend organic market produce",
      intervalN: 2,
      intervalUnit: "weeks",
      anchorDay: 10,
      startDate: "2026-09-12",
      nextRunDate: "2026-10-24",
      lastRunDate: "2026-10-10",
      endType: "never",
      postedCount: 3,
      status: "active",
      authorName: "Alex Demo",
      authorRole: "owner",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
    {
      id: "seed-rule-month-end-clamping",
      title: "Month-End Clamping Demo (Day 31)",
      amount: 500,
      type: "expense",
      walletId: cashWalletId,
      categoryId: null,
      note: "Verifies Jan 31 -> Feb 28 -> Mar 31 calendar clamping",
      intervalN: 1,
      intervalUnit: "months",
      anchorDay: 31,
      startDate: "2026-01-31",
      nextRunDate: "2026-10-31",
      lastRunDate: "2026-09-30",
      endType: "never",
      postedCount: 9,
      status: "active",
      authorName: "Alex Demo",
      authorRole: "owner",
      createdAt: "2026-01-31T00:00:00.000Z",
      updatedAt: "2026-01-31T00:00:00.000Z",
    },
    {
      id: "seed-rule-cloud-backup-paused",
      title: "Off-site Backup Storage (Paused)",
      amount: 320,
      type: "expense",
      walletId: mainBankId,
      categoryId: null,
      note: "Paused server backup subscription",
      intervalN: 1,
      intervalUnit: "months",
      anchorDay: 15,
      startDate: "2026-05-15",
      nextRunDate: "2026-07-15", // Overdue because paused!
      lastRunDate: "2026-06-15",
      endType: "never",
      postedCount: 2,
      status: "paused",
      authorName: "Alex Demo",
      authorRole: "owner",
      createdAt: "2026-05-15T00:00:00.000Z",
      updatedAt: "2026-07-10T00:00:00.000Z",
    },
    {
      id: "seed-rule-completed-loan",
      title: "Appliance 3-Month Installment",
      amount: 2200,
      type: "expense",
      walletId: mainBankId,
      categoryId: null,
      note: "Completed 0% installment plan",
      intervalN: 1,
      intervalUnit: "months",
      anchorDay: 10,
      startDate: "2026-05-10",
      nextRunDate: "2026-08-10",
      lastRunDate: "2026-07-10",
      endType: "count",
      totalOccurrences: 3,
      postedCount: 3,
      status: "completed",
      authorName: "Alex Demo",
      authorRole: "owner",
      createdAt: "2026-05-10T00:00:00.000Z",
      updatedAt: "2026-07-10T00:00:00.000Z",
    },
  ];
}

interface RecurringRulesState {
  rules: RecurringRule[];
  simulatedDate: string;
  logs: SimulationLogEntry[];
  selectedRuleIdForLedger: string | "all";
  hasHydrated: boolean;

  // Actions
  setSimulatedDate: (date: string) => void;
  addRule: (rule: Omit<RecurringRule, "id" | "createdAt" | "updatedAt" | "postedCount">) => RecurringRule;
  updateRule: (id: string, updates: Partial<RecurringRule>) => void;
  deleteRule: (id: string) => void;
  pauseRule: (id: string) => void;
  resumeRule: (id: string, nextRunDate: string) => void;
  recordOccurrenceExecution: (
    ruleId: string,
    nextRunDate: string,
    isCompleted: boolean,
    log: SimulationLogEntry
  ) => void;
  addLog: (log: SimulationLogEntry) => void;
  clearLogs: () => void;
  setSelectedRuleIdForLedger: (id: string | "all") => void;
  resetTestData: (wallets?: Wallet[], categories?: Category[]) => void;
  reconcileWithWallets: (wallets: Wallet[]) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useRecurringRules = create<RecurringRulesState>()(
  persist(
    (set) => ({
      rules: createDefaultSeedRules(),
      simulatedDate: todayISODate(),
      logs: [],
      selectedRuleIdForLedger: "all",
      hasHydrated: false,

      setHasHydrated: (v) => set({ hasHydrated: v }),

      setSimulatedDate: (date) => set({ simulatedDate: date }),

      addRule: (ruleInput) => {
        const id = `rule-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();
        const anchorDay = ruleInput.anchorDay ?? parseISODateParts(ruleInput.startDate)[2];

        const newRule: RecurringRule = {
          ...ruleInput,
          id,
          anchorDay,
          postedCount: 0,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          rules: [newRule, ...state.rules],
        }));

        return newRule;
      },

      updateRule: (id, updates) => {
        set((state) => ({
          rules: state.rules.map((rule) => {
            if (rule.id !== id) return rule;
            return {
              ...rule,
              ...updates,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      deleteRule: (id) => {
        set((state) => ({
          rules: state.rules.filter((rule) => rule.id !== id),
          selectedRuleIdForLedger:
            state.selectedRuleIdForLedger === id ? "all" : state.selectedRuleIdForLedger,
        }));
      },

      pauseRule: (id) => {
        set((state) => ({
          rules: state.rules.map((rule) =>
            rule.id === id ? { ...rule, status: "paused", updatedAt: new Date().toISOString() } : rule
          ),
        }));
      },

      resumeRule: (id, nextRunDate) => {
        set((state) => ({
          rules: state.rules.map((rule) =>
            rule.id === id
              ? {
                  ...rule,
                  status: "active",
                  nextRunDate,
                  updatedAt: new Date().toISOString(),
                }
              : rule
          ),
        }));
      },

      recordOccurrenceExecution: (ruleId, nextRunDate, isCompleted, log) => {
        set((state) => ({
          rules: state.rules.map((rule) => {
            if (rule.id !== ruleId) return rule;
            const newPostedCount = rule.postedCount + 1;
            return {
              ...rule,
              postedCount: newPostedCount,
              lastRunDate: log.simulatedDate,
              nextRunDate,
              status: isCompleted ? "completed" : rule.status,
              updatedAt: new Date().toISOString(),
            };
          }),
          logs: [log, ...state.logs.slice(0, 99)],
        }));
      },

      addLog: (log) => {
        set((state) => ({
          logs: [log, ...state.logs.slice(0, 99)],
        }));
      },

      clearLogs: () => set({ logs: [] }),

      setSelectedRuleIdForLedger: (id) => set({ selectedRuleIdForLedger: id }),

      resetTestData: (wallets = [], categories = []) => {
        const defaultRules = createDefaultSeedRules(wallets, categories);
        set({
          rules: defaultRules,
          simulatedDate: todayISODate(),
          logs: [
            {
              id: `log-reset-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              simulatedDate: todayISODate(),
              ruleId: "system",
              ruleTitle: "System",
              amount: 0,
              type: "expense",
              walletName: "All",
              occurrenceNumber: 0,
              action: "completed",
              message: "Test environment reset: loaded 8 demo recurring rules.",
            },
          ],
          selectedRuleIdForLedger: "all",
        });
      },

      reconcileWithWallets: (wallets) => {
        if (!wallets.length) return;
        const mainBank = wallets.find((w) => w.name.toLowerCase().includes("bank")) || wallets[0];
        const cashWallet = wallets.find((w) => w.name.toLowerCase().includes("cash")) || wallets[1] || wallets[0];

        set((state) => ({
          rules: state.rules.map((rule) => {
            const hasWallet = wallets.some((w) => w.id === rule.walletId);
            if (hasWallet) return rule;
            // Re-bind to valid wallet
            const target = rule.walletId.includes("cash") ? cashWallet.id : mainBank.id;
            return { ...rule, walletId: target };
          }),
        }));
      },
    }),
    {
      name: "finlover_recurring_rules_v1",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

