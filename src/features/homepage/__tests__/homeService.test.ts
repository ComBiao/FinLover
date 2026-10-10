import { beforeEach, describe, expect, it, vi } from "vitest";

import { getHomeSummary } from "../services/homeService";
import * as walletsService from "@/features/wallets/walletsService";
import * as transactionsService from "@/features/transactions/transactionsService";
import * as categoriesService from "@/features/transactions/categoriesService";
import type { Wallet } from "@/types/wallet";
import type { Transaction } from "@/types/transaction";
import type { Category } from "@/types/category";
import { PiggyBank, Tag, Wallet as WalletIcon } from "lucide-react";

const testWallets: Wallet[] = [
  {
    id: "w1",
    name: "Daily",
    balance: 5000,
    isDefault: true,
    color: "#4A4757",
    isSaving: false,
    icon: WalletIcon,
    type: "cash",
  },
  {
    id: "w2",
    name: "Vacation",
    balance: 8000,
    isDefault: false,
    color: "#8B7CF6",
    isSaving: true,
    savingGoal: 20000,
    icon: PiggyBank,
    type: "savings",
  },
];

const testCategories: Category[] = [
  { id: "c1", name: "Food", type: "expense", color: "#FF5733", icon: Tag },
  { id: "c2", name: "Transport", type: "expense", color: "#33FF57", icon: Tag },
  { id: "c3", name: "Salary", type: "income", color: "#3357FF", icon: Tag },
];

const testTransactions: Transaction[] = [
  {
    id: "t1",
    walletId: "w1",
    categoryId: "c1",
    type: "expense",
    amount: 300,
    date: new Date("2026-10-05T10:00:00Z"),
    title: "Lunch",
  },
  {
    id: "t2",
    walletId: "w1",
    categoryId: "c2",
    type: "expense",
    amount: 150,
    date: new Date("2026-10-06T10:00:00Z"),
    title: "BTS train",
  },
  {
    id: "t3",
    walletId: "w1",
    categoryId: "c3",
    type: "income",
    amount: 10000,
    date: new Date("2026-10-01T10:00:00Z"),
    title: "Part-time job",
  },
  {
    id: "t4",
    walletId: "w1",
    categoryId: "c1",
    type: "expense",
    amount: 500,
    date: new Date("2026-09-15T10:00:00Z"), // Different month (September)
    title: "Dinner last month",
  },
];

describe("homeService — getHomeSummary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(walletsService, "getWallets").mockResolvedValue(testWallets);
    vi.spyOn(transactionsService, "getTransactions").mockResolvedValue(testTransactions);
    vi.spyOn(categoriesService, "getCategories").mockResolvedValue(testCategories);
  });

  it("calculates summary for all wallets in October 2026", async () => {
    const summary = await getHomeSummary("2026-10", "all");

    // Total balance: w1 (5000) + w2 (8000) = 13000
    expect(summary.balance.totalBalance).toBe(13000);
    expect(summary.balance.hasWallets).toBe(true);
    // Combined view has no single saving goal
    expect(summary.balance.savingGoal).toBeNull();

    // Income for 2026-10: t3 (10000)
    expect(summary.income).toBe(10000);

    // Expense for 2026-10: t1 (300) + t2 (150) = 450 (t4 is in September, excluded)
    expect(summary.expense).toBe(450);

    // Net: 10000 - 450 = 9550
    expect(summary.net.net).toBe(9550);
    expect(summary.net.status).toBe("surplus");

    // Top categories: Food (300) is #1, Transport (150) is #2
    expect(summary.topCategories).toHaveLength(2);
    expect(summary.topCategories[0]).toMatchObject({
      categoryId: "c1",
      name: "Food",
      amount: 300,
      rank: 1,
    });
    expect(summary.topCategories[1]).toMatchObject({
      categoryId: "c2",
      name: "Transport",
      amount: 150,
      rank: 2,
    });
  });

  it("calculates summary scoped to specific saving wallet (w2)", async () => {
    const summary = await getHomeSummary("2026-10", "w2");

    // Total balance: w2 only = 8000
    expect(summary.balance.totalBalance).toBe(8000);

    // Saving goal: goal 20000, current 8000 -> 40%, remaining 12000
    expect(summary.balance.savingGoal).toEqual({
      walletId: "w2",
      walletName: "Vacation",
      goal: 20000,
      current: 8000,
      percent: 40,
      remaining: 12000,
      reached: false,
    });

    // No transactions in w2
    expect(summary.income).toBe(0);
    expect(summary.expense).toBe(0);
    expect(summary.net.net).toBe(0);
    expect(summary.net.status).toBe("even");
  });
});

