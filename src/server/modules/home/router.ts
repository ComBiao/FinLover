import type { WalletRepositoryPort } from '@/server/shared/ports/wallets';
import type { TransactionRepositoryPort } from '@/server/shared/ports/transactions';
import { applicationTimezone } from '@/server/shared/config/env';
import { GetHomeSummaryController } from './controllers/GetHomeSummaryController';
import { GetHomeSummaryService } from './services/GetHomeSummaryService';

export function createHomeRouter(wallets: Pick<WalletRepositoryPort, 'list'>, transactions: Pick<TransactionRepositoryPort, 'findByDateRange'>) {
  const summary = new GetHomeSummaryController(new GetHomeSummaryService(wallets, transactions, () => new Date(), applicationTimezone));
  return { summary: summary.handle.bind(summary) };
}
