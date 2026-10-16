import type { TransactionSummaryReader } from '@/server/shared/ports/transactions';
import type { WalletRepositoryPort } from '@/server/shared/ports/wallets';
import type { CategoryRepositoryPort } from '@/server/shared/ports/categories';
import { AppError } from '@/server/shared/kernel/AppError';

export type TransactionSummaryQuery = {
  from: string;
  to: string;
  walletId?: string;
  categoryId?: string;
  type?: 'income' | 'expense';
  search?: string;
};

/** Name of the system category seeded per type at registration; category-less rows count toward it. */
const FALLBACK_CATEGORY_NAME = 'Others';

/** UTC midnight of a YYYY-MM-DD date, the form transaction dates are stored in. */
function utcDate(value: string, addDays = 0) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + addDays);
  return date;
}

/** Total income, total expense and net balance for the Transactions page's active filters (US3-6). */
export class GetTransactionSummaryService {
  constructor(
    private transactions: TransactionSummaryReader,
    private wallets: Pick<WalletRepositoryPort, 'findOwned'>,
    private categories: Pick<CategoryRepositoryPort, 'findOwned'>,
  ) {}

  async execute(userId: string, { from, to, walletId, categoryId, type, search }: TransactionSummaryQuery) {
    if (walletId && !await this.wallets.findOwned(walletId, userId)) throw new AppError('NOT_FOUND', 'Wallet not found');

    let categoryIds: (string | null)[] | undefined;
    if (categoryId) {
      const category = await this.categories.findOwned(categoryId, userId);
      if (!category) throw new AppError('NOT_FOUND', 'Category not found');
      categoryIds = [categoryId];
      // Same rule as the list: a transaction without a category belongs to its type's seeded Others,
      // so that Others also matches category-less rows — of its own type only.
      if (category.isSystem && category.name === FALLBACK_CATEGORY_NAME) {
        if (type && type !== category.type) return { totalIncome: 0, totalExpense: 0, netBalance: 0 };
        categoryIds.push(null);
        type = category.type;
      }
    }

    const { income, expense } = await this.transactions.sumByType(userId, {
      start: utcDate(from),
      end: utcDate(to, 1),
      walletId,
      type,
      categoryIds,
      search,
    });
    return { totalIncome: income, totalExpense: expense, netBalance: income - expense };
  }
}
