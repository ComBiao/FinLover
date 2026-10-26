import type { RunningBalanceQuery } from '@/shared/contracts';
import type { TransactionReportReader, TransactionSummaryReader } from '@/server/shared/ports/transactions';
import type { ReportWalletScope } from './ReportWalletScope';
import { assertBucketLimit, buildBuckets, totalsPerBucket, utcDate } from './report-period';
import { fromCents, toCents } from './report-math';

/**
 * Combined balance of the selected wallets at the end of each day or week (US8-5).
 * Wallets keep no opening balance and only transactions move a balance, so the balance before
 * startDate is worked back from the current one: current balance minus the net of every
 * transaction dated on or after startDate, including those after endDate.
 */
export class GetRunningBalanceService {
  constructor(private scope: ReportWalletScope, private transactions: Pick<TransactionReportReader, 'totalsByDay'> & TransactionSummaryReader) {}

  async execute(userId: string, { walletIds, startDate, endDate, interval }: RunningBalanceQuery) {
    assertBucketLimit(startDate, endDate, interval);
    const wallets = await this.scope.resolve(userId, walletIds);
    const ids = wallets.map(wallet => wallet.id);
    const start = utcDate(startDate);
    const [days, sinceStart] = await Promise.all([
      this.transactions.totalsByDay(userId, { start, end: utcDate(endDate, 1), walletIds: ids }),
      this.transactions.sumByType(userId, { start, walletIds: ids }),
    ]);
    const currentCents = wallets.reduce((sum, wallet) => sum + toCents(wallet.balance), 0);
    const openingCents = currentCents - (toCents(sinceStart.income) - toCents(sinceStart.expense));

    let balance = openingCents;
    // A bucket without transactions carries the previous balance forward; it may go negative.
    const points = totalsPerBucket(buildBuckets(startDate, endDate, interval), days).map(bucket => {
      balance += bucket.income - bucket.expense;
      return { date: bucket.end, balance: fromCents(balance) };
    });
    return { interval, openingBalance: fromCents(openingCents), closingBalance: fromCents(balance), points };
  }
}
