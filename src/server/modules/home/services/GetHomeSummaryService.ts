import type { WalletRecord, WalletRepositoryPort } from '@/server/shared/ports/wallets';
import type { TransactionRepositoryPort } from '@/server/shared/ports/transactions';
import { AppError } from '@/server/shared/kernel/AppError';
import { currentMonth, monthBoundaries } from '@/server/modules/transactions/services/GetTransactionsByMonthService';

export type HomeSummaryQuery = { month?: string; walletId: string };

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
    const monthTransactions = (await this.transactions.findByDateRange(userId, start, end))
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
    };
  }
}
