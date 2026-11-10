import { cashFlowQuery, reportQuery, runningBalanceQuery } from '@/shared/contracts';
import type { WalletReaderPort, WalletRepositoryPort } from '@/server/shared/ports/wallets';
import type { TransactionReportReader, TransactionSummaryReader } from '@/server/shared/ports/transactions';
import type { CategoryRepositoryPort } from '@/server/shared/ports/categories';
import { GetReportController } from './controllers/GetReportController';
import { ReportWalletScope } from './services/ReportWalletScope';
import { GetReportSummaryService } from './services/GetReportSummaryService';
import { GetCashFlowService } from './services/GetCashFlowService';
import { GetCategoryDistributionService } from './services/GetCategoryDistributionService';
import { GetRunningBalanceService } from './services/GetRunningBalanceService';

export function createReportRouter(wallets: Pick<WalletRepositoryPort, 'list'> & Pick<WalletReaderPort, 'listAccessible'>, transactions: TransactionSummaryReader & TransactionReportReader, categories: Pick<CategoryRepositoryPort, 'list'>) {
  const scope = new ReportWalletScope(wallets);
  const summary = new GetReportController(reportQuery, new GetReportSummaryService(scope, transactions));
  const cashFlow = new GetReportController(cashFlowQuery, new GetCashFlowService(scope, transactions));
  const categoryDistribution = new GetReportController(reportQuery, new GetCategoryDistributionService(scope, transactions, categories));
  const runningBalance = new GetReportController(runningBalanceQuery, new GetRunningBalanceService(scope, transactions));
  return {
    summary: summary.handle.bind(summary),
    cashFlow: cashFlow.handle.bind(cashFlow),
    categoryDistribution: categoryDistribution.handle.bind(categoryDistribution),
    runningBalance: runningBalance.handle.bind(runningBalance),
  };
}
