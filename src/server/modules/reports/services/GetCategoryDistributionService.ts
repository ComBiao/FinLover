import { sharedCategoryOf, type ReportQuery } from '@/shared/contracts';
import type { TransactionReportReader } from '@/server/shared/ports/transactions';
import type { CategoryRepositoryPort } from '@/server/shared/ports/categories';
import { walletFilterOf, type ReportWalletScope } from './ReportWalletScope';
import { utcDate } from './report-period';
import { fromCents, largestRemainderPercentages, toCents } from './report-math';

type CategoryDoc = { _id: unknown; name: string; type: 'income' | 'expense'; isSystem?: boolean; icon?: string; color?: string };
type CategoryTotal = Awaited<ReturnType<TransactionReportReader['totalsByCategory']>>[number];
type Entry = { categoryId: string | null; name: string; icon: string | null; color: string | null; amount: number };

/** Name of the system category seeded per type at registration; category-less rows count toward it, as on Home. */
const FALLBACK_CATEGORY_NAME = 'Others';
/** Used when the user has no seeded Others of that type to collect category-less rows. */
const UNCATEGORIZED_NAME = 'Other (No Category)';

/**
 * One type's categories, largest first, with percentages adding up to 100.0.
 * A shared wallet has no user categories, only the preset list, so its rows are named after the preset;
 * a personal category and a preset with the same name (for example "Food & Drinks") are one slice.
 */
function groupOf(type: 'income' | 'expense', rows: CategoryTotal[], categories: CategoryDoc[]) {
  const byId = new Map(categories.filter(category => category.type === type).map(category => [String(category._id), category]));
  const fallback = categories.find(category => category.isSystem && category.type === type && category.name === FALLBACK_CATEGORY_NAME);
  const byName = new Map<string, Entry>();
  const add = (entry: Omit<Entry, 'amount'>, amount: number) => {
    const existing = byName.get(entry.name);
    if (!existing) return void byName.set(entry.name, { ...entry, amount });
    existing.amount += amount;
    existing.categoryId ??= entry.categoryId;
    existing.icon ??= entry.icon;
    existing.color ??= entry.color;
  };

  const ofType = rows.filter(row => row.type === type);
  // Personal rows first, so a personal category's id, icon and color win over the preset of the same name.
  for (const row of ofType.filter(row => !row.shared)) {
    // Rows without a (known) category merge into Others before percentages are taken.
    const id = row.categoryId && byId.has(row.categoryId) ? row.categoryId : fallback ? String(fallback._id) : null;
    const category = id === null ? undefined : byId.get(id);
    add({ categoryId: id, name: category?.name ?? UNCATEGORIZED_NAME, icon: category?.icon ?? null, color: category?.color ?? null }, toCents(row.amount));
  }
  for (const row of ofType.filter(row => row.shared)) {
    const preset = sharedCategoryOf(row.categoryKey, type);
    add({ categoryId: null, name: preset.name, icon: preset.icon, color: preset.color }, toCents(row.amount));
  }

  const entries = [...byName.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  const percentages = largestRemainderPercentages(entries.map(entry => entry.amount));
  return {
    total: fromCents(entries.reduce((sum, entry) => sum + entry.amount, 0)),
    items: entries.map((entry, index) => ({ ...entry, amount: fromCents(entry.amount), percentage: percentages[index] })),
  };
}

/** Income and expense split by category for the report filter (US8-4). */
export class GetCategoryDistributionService {
  constructor(
    private scope: ReportWalletScope,
    private transactions: Pick<TransactionReportReader, 'totalsByCategory'>,
    private categories: Pick<CategoryRepositoryPort, 'list'>,
  ) {}

  async execute(userId: string, { walletIds, startDate, endDate }: ReportQuery) {
    const wallets = await this.scope.resolve(userId, walletIds);
    const [rows, categories] = await Promise.all([
      this.transactions.totalsByCategory(userId, { start: utcDate(startDate), end: utcDate(endDate, 1), ...walletFilterOf(wallets) }),
      this.categories.list(userId) as Promise<CategoryDoc[]>,
    ]);
    return { income: groupOf('income', rows, categories), expense: groupOf('expense', rows, categories) };
  }
}
