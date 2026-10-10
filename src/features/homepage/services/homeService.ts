import { getCategories } from "@/features/transactions/categoriesService";
import { getTransactions } from "@/features/transactions/transactionsService";
import { getWallets } from "@/features/transactions/walletsService";
import { isDateInMonth, type MonthKey } from "@/features/homepage/month";
import type { Category } from "@/types/category";
import type { Wallet } from "@/types/wallet";

export type HomeSavingGoal = {
  walletId: string;
  walletName: string;
  goal: number;
  current: number;
  percent: number;
  remaining: number;
  reached: boolean;
};

export type HomeTopCategory = {
  rank: number;
  categoryId: string | null;
  name: string;
  icon: Category["icon"] | undefined;
  color: string | undefined;
  amount: number;
};

export type HomeSummary = {
  month: MonthKey;
  walletId: string;
  balance: {
    hasWallets: boolean;
    totalBalance: number;
    savingGoal: HomeSavingGoal | null;
  };
  expense: number;
  income: number;
  net: { net: number; status: "surplus" | "overspending" | "even" };
  topCategories: HomeTopCategory[];
};

const UNCATEGORIZED_KEY = "__uncategorized__";

function computeSavingGoal(wallet: Wallet | undefined): HomeSavingGoal | null {
  if (!wallet?.isSaving || !wallet.savingGoal) return null;

  const percent = Math.max(0, Math.min(100, Math.floor((wallet.balance / wallet.savingGoal) * 100)));
  return {
    walletId: wallet.id,
    walletName: wallet.name,
    goal: wallet.savingGoal,
    current: wallet.balance,
    percent,
    remaining: Math.max(0, wallet.savingGoal - wallet.balance),
    reached: wallet.balance >= wallet.savingGoal,
  };
}

// TODO(backend): replace with fetch(`/api/home/summary?month=${month}&walletId=${walletId}`)
export async function getHomeSummary(month: MonthKey, walletId: string): Promise<HomeSummary> {
  const [transactions, wallets, categories] = await Promise.all([
    getTransactions(),
    getWallets(),
    getCategories(),
  ]);

  const scopedWallets = walletId === "all" ? wallets : wallets.filter((w) => w.id === walletId);
  const totalBalance = scopedWallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  const savingGoal =
    walletId === "all" ? null : computeSavingGoal(wallets.find((w) => w.id === walletId));

  const monthTransactions = transactions.filter(
    (transaction) =>
      (walletId === "all" || transaction.walletId === walletId) &&
      isDateInMonth(transaction.date, month)
  );
  const income = monthTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = monthTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const net = income - expense;

  const amountByCategory = new Map<string, number>();
  for (const transaction of monthTransactions) {
    if (transaction.type !== "expense") continue;
    const key = transaction.categoryId ?? UNCATEGORIZED_KEY;
    amountByCategory.set(key, (amountByCategory.get(key) ?? 0) + transaction.amount);
  }

  const topCategories: HomeTopCategory[] = [...amountByCategory.entries()]
    .map(([categoryId, amount]) => {
      const category = categoryId === UNCATEGORIZED_KEY ? undefined : categories.find((c) => c.id === categoryId);
      return {
        categoryId: category?.id ?? null,
        name: category?.name ?? "Uncategorized",
        icon: category?.icon,
        color: category?.color,
        amount,
      };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name))
    .slice(0, 3)
    .map((entry, index) => ({ rank: index + 1, ...entry }));

  return {
    month,
    walletId,
    balance: { hasWallets: wallets.length > 0, totalBalance, savingGoal },
    expense,
    income,
    net: { net, status: net > 0 ? "surplus" : net < 0 ? "overspending" : "even" },
    topCategories,
  };
}
