import { resolveCategoryIcon } from "@/features/categories/categoryIcons";
import type { MonthKey } from "@/features/homepage/month";
import { getApi } from "@/lib/api/client";
import { isMockTarget } from "@/features/wallets/shared/mockFlag";
import { mockHomeSummary } from "@/features/wallets/shared/mock/sharedWalletMockStore";
import type { Category } from "@/types/category";

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
  /** Shared wallets only: the fixed preset the row group belongs to (there is no `categoryId`). */
  categoryKey?: string;
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

/** `GET /api/v1/home/summary` (see `homeSummaryResponse` in `@/shared/contracts`). */
type HomeSummaryDto = Omit<HomeSummary, "topCategories"> & {
  topCategories: (Omit<HomeTopCategory, "icon" | "color"> & { icon: string | null; color: string | null })[];
};

/**
 * Home summary figures (balance, income, expense, net, top categories and
 * saving goal, US2-1 through US2-7), computed by the server for one month and
 * either every wallet ("all") or one wallet.
 */
export async function getHomeSummary(month: MonthKey, walletId: string): Promise<HomeSummary> {
  // TODO(backend E7-15): remove; the same endpoint will answer for a shared wallet id (members only, no top categories).
  if (isMockTarget(walletId)) return mockHomeSummary(month, walletId);

  const params = new URLSearchParams({ month, walletId });
  const dto = await getApi<HomeSummaryDto>(`/api/v1/home/summary?${params}`);
  return {
    ...dto,
    topCategories: dto.topCategories.map((category) => ({
      ...category,
      icon: category.icon ? resolveCategoryIcon(category.icon) : undefined,
      color: category.color ?? undefined,
    })),
  };
}
