import type { WalletRecord, WalletRepositoryPort } from '@/server/shared/ports/wallets';
import type { TransactionRecord, TransactionRepositoryPort } from '@/server/shared/ports/transactions';
import type { CategoryRepositoryPort } from '@/server/shared/ports/categories';
import { AppError } from '@/server/shared/kernel/AppError';
import { currentMonth, monthBoundaries } from '@/server/modules/transactions/services/GetTransactionsByMonthService';

export type HomeSummaryQuery = { month?: string; walletId: string };

type CategoryDoc = { _id: unknown; name: string; type: 'income' | 'expense'; isSystem?: boolean; icon?: string; color?: string };

const TOP_CATEGORY_COUNT = 3;
/** Name of the system category seeded per type at registration; category-less rows count toward it. */
const FALLBACK_CATEGORY_NAME = 'Others';

/** The month's expense categories ranked by amount spent, ties broken by name (US2-5). */
function topCategoriesOf(transactions: TransactionRecord[], categories: CategoryDoc[]) {
  const byId = new Map(categories.map(category => [String(category._id), category]));
  const fallback = categories.find(category => category.isSystem && category.type === 'expense' && category.name === FALLBACK_CATEGORY_NAME);
  const amounts = new Map<string | null, number>();
  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;
    const key = transaction.categoryId ?? (fallback ? String(fallback._id) : null);
    amounts.set(key, (amounts.get(key) ?? 0) + transaction.amount);
  }
  return [...amounts.entries()]
    .map(([categoryId, amount]) => {
      const category = categoryId === null ? undefined : byId.get(categoryId);
      return { categoryId, name: category?.name ?? FALLBACK_CATEGORY_NAME, icon: category?.icon ?? null, color: category?.color ?? null, amount };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name))
    .slice(0, TOP_CATEGORY_COUNT)
    .map((entry, index) => ({ rank: index + 1, ...entry }));
}

/** Progress toward a saving wallet's goal; null unless that one wallet is selected and is saving with a goal (US2-7). */
function savingGoalOf(wallet: WalletRecord | undefined) {
  if (!wallet?.isSaving || !wallet.goalAmount) return null;
  const goal = wallet.goalAmount;
  const current = wallet.balance;
  return {
    walletId: wallet.id,
    walletName: wallet.name,
    goal,
    current,
    // Floored so the bar never shows 100% before the goal is actually reached.
    percent: Math.max(0, Math.min(100, Math.floor((current / goal) * 100))),
    remaining: Math.max(0, goal - current),
    reached: current >= goal,
  };
}

/** Home page figures for one month and either every owned wallet ("all") or one of them (US2-1 to US2-7). */
export class GetHomeSummaryService {
  constructor(
    private wallets: Pick<WalletRepositoryPort, 'list'>,
    private transactions: Pick<TransactionRepositoryPort, 'findByDateRange'>,
    private categories: Pick<CategoryRepositoryPort, 'list'>,
    private now: () => Date,
    private timezone: () => string,
  ) {}

  async execute(userId: string, { month: requestedMonth, walletId }: HomeSummaryQuery) {
    const month = requestedMonth ?? currentMonth(this.now(), this.timezone());
    const wallets = await this.wallets.list(userId);
    const scoped = walletId === 'all' ? wallets : wallets.filter(wallet => wallet.id === walletId);
    // The list is already limited to the caller, so an unknown or foreign id looks the same.
    if (walletId !== 'all' && scoped.length === 0) throw new AppError('NOT_FOUND', 'Wallet not found');

    const { start, end } = monthBoundaries(month);
    const [rows, categories] = await Promise.all([
      this.transactions.findByDateRange(userId, start, end),
      this.categories.list(userId) as Promise<CategoryDoc[]>,
    ]);
    const monthTransactions = rows
      .filter(transaction => walletId === 'all' || transaction.walletId === walletId);
    const total = (type: 'income' | 'expense') => monthTransactions
      .filter(transaction => transaction.type === type)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const income = total('income');
    const expense = total('expense');
    const net = income - expense;

    return {
      month,
      walletId,
      balance: {
        hasWallets: wallets.length > 0,
        totalBalance: scoped.reduce((sum, wallet) => sum + wallet.balance, 0),
        savingGoal: walletId === 'all' ? null : savingGoalOf(scoped[0]),
      },
      income,
      expense,
      net: { net, status: net > 0 ? 'surplus' : net < 0 ? 'overspending' : 'even' },
      topCategories: topCategoriesOf(monthTransactions, categories),
    };
  }
}
