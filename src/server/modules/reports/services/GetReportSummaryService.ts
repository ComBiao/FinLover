import type { ReportQuery } from '@/shared/contracts';
import type { TransactionSummaryReader } from '@/server/shared/ports/transactions';
import { walletFilterOf, type ReportWalletScope } from './ReportWalletScope';
import { utcDate } from './report-period';
import { fromCents, roundMoney, toCents } from './report-math';

/** Total income, total expense, net cash flow and transaction count for the report filter (US8-2). */
export class GetReportSummaryService {
  constructor(private scope: ReportWalletScope, private transactions: TransactionSummaryReader) {}

  async execute(userId: string, { walletIds, startDate, endDate }: ReportQuery) {
    const wallets = await this.scope.resolve(userId, walletIds);
    const { income, expense, count } = await this.transactions.sumByType(userId, {
      start: utcDate(startDate),
      end: utcDate(endDate, 1),
      ...walletFilterOf(wallets),
    });
    return {
      totalIncome: roundMoney(income),
      totalExpense: roundMoney(expense),
      netCashFlow: fromCents(toCents(income) - toCents(expense)),
      transactionCount: count,
    };
  }
}
