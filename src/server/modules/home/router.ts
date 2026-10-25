import type { WalletRepositoryPort, WalletReaderPort } from '@/server/shared/ports/wallets';
import type { TransactionRepositoryPort } from '@/server/shared/ports/transactions';
import type { CategoryRepositoryPort } from '@/server/shared/ports/categories';
import { applicationTimezone } from '@/server/shared/config/env';
import { GetHomeSummaryController } from './controllers/GetHomeSummaryController';
import { GetHomeSummaryService } from './services/GetHomeSummaryService';

export function createHomeRouter(wallets: Pick<WalletRepositoryPort, 'list'> & WalletReaderPort, transactions: Pick<TransactionRepositoryPort, 'findByDateRange'>, categories: Pick<CategoryRepositoryPort, 'list'>) {
  const summary = new GetHomeSummaryController(new GetHomeSummaryService(wallets, transactions, categories, () => new Date(), applicationTimezone));
  return { summary: summary.handle.bind(summary) };
}
