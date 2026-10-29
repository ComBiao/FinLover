import type { CashFlowQuery } from '@/shared/contracts';
import type { TransactionReportReader } from '@/server/shared/ports/transactions';
import { walletFilterOf, type ReportWalletScope } from './ReportWalletScope';
import { assertBucketLimit, buildBuckets, suggestedInterval, totalsPerBucket, utcDate } from './report-period';
import { fromCents } from './report-math';

/** Income and expense per daily, weekly or monthly bucket, empty buckets included (US8-3). */
export class GetCashFlowService {
  constructor(private scope: ReportWalletScope, private transactions: Pick<TransactionReportReader, 'totalsByDay'>) {}

  async execute(userId: string, { walletIds, startDate, endDate, interval: requested }: CashFlowQuery) {
    const suggested = suggestedInterval(startDate, endDate);
    const interval = requested ?? suggested;
    assertBucketLimit(startDate, endDate, interval);
    const wallets = await this.scope.resolve(userId, walletIds);
    const days = await this.transactions.totalsByDay(userId, {
      start: utcDate(startDate),
      end: utcDate(endDate, 1),
      ...walletFilterOf(wallets),
    });
    const buckets = totalsPerBucket(buildBuckets(startDate, endDate, interval), days)
      .map(bucket => ({ ...bucket, income: fromCents(bucket.income), expense: fromCents(bucket.expense) }));
    return { interval, suggestedInterval: suggested, buckets };
  }
}
