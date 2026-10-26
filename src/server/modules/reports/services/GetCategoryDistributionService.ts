import type { ReportQuery } from '@/shared/contracts';
import type { TransactionReportReader } from '@/server/shared/ports/transactions';
import type { CategoryRepositoryPort } from '@/server/shared/ports/categories';
import type { ReportWalletScope } from './ReportWalletScope';
import { utcDate } from './report-period';
import { fromCents, largestRemainderPercentages, toCents } from './report-math';

type CategoryDoc = { _id: unknown; name: string; type: 'income' | 'expense'; isSystem?: boolean; icon?: string; color?: string };
type CategoryTotal = Awaited<ReturnType<TransactionReportReader['totalsByCategory']>>[number];

/** Name of the system category seeded per type at registration; category-less rows count toward it, as on Home. */
const FALLBACK_CATEGORY_NAME = 'Others';
/** Used when the user has no seeded Others of that type to collect category-less rows. */
const UNCATEGORIZED_NAME = 'Other (No Category)';

/** One type's categories, largest first, with percentages adding up to 100.0. */
function groupOf(type: 'income' | 'expense', rows: CategoryTotal[], categories: CategoryDoc[]) {
  const byId = new Map(categories.filter(category => category.type === type).map(category => [String(category._id), category]));
  const fallback = categories.find(category => category.isSystem && category.type === type && category.name === FALLBACK_CATEGORY_NAME);
  const cents = new Map<string | null, number>();
  for (const row of rows) {
    if (row.type !== type) continue;
    // Rows without a (known) category merge into Others before percentages are taken.
    const key = row.categoryId && byId.has(row.categoryId) ? row.categoryId : fallback ? String(fallback._id) : null;
    cents.set(key, (cents.get(key) ?? 0) + toCents(row.amount));
  }
  const entries = [...cents.entries()]
    .map(([categoryId, amount]) => {
      const category = categoryId === null ? undefined : byId.get(categoryId);
      return { categoryId, name: category?.name ?? UNCATEGORIZED_NAME, icon: category?.icon ?? null, color: category?.color ?? null, amount };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
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
      this.transactions.totalsByCategory(userId, { start: utcDate(startDate), end: utcDate(endDate, 1), walletIds: wallets.map(wallet => wallet.id) }),
      this.categories.list(userId) as Promise<CategoryDoc[]>,
    ]);
    return { income: groupOf('income', rows, categories), expense: groupOf('expense', rows, categories) };
  }
}
