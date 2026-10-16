import type { WalletRepositoryPort } from '@/server/shared/ports/wallets';
import { applicationTimezone } from '@/server/shared/config/env';
import { GetHomeSummaryController } from './controllers/GetHomeSummaryController';
import { GetHomeSummaryService } from './services/GetHomeSummaryService';

export function createHomeRouter(wallets: Pick<WalletRepositoryPort, 'list'>) {
  const summary = new GetHomeSummaryController(new GetHomeSummaryService(wallets, () => new Date(), applicationTimezone));
  return { summary: summary.handle.bind(summary) };
}
