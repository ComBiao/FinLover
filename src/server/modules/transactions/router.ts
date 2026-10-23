import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { CreateTransactionService } from './services/CreateTransactionService';
import { CreateTransactionController } from './controllers/CreateTransactionController';
import { UpdateTransactionService } from './services/UpdateTransactionService';
import { UpdateTransactionController } from './controllers/UpdateTransactionController';
import { DeleteTransactionService } from './services/DeleteTransactionService';
import { DeleteTransactionController } from './controllers/DeleteTransactionController';
import { TransactionRepository } from './repositories/TransactionRepository';
import type { WalletAccess, CategoryAccess } from '@/server/shared/ports/transactions';
import type { WalletRepositoryPort } from '@/server/shared/ports/wallets';
import type { CategoryRepositoryPort } from '@/server/shared/ports/categories';
import { GetTransactionSummaryController } from './controllers/GetTransactionSummaryController';
import { GetTransactionSummaryService } from './services/GetTransactionSummaryService';
import { GetTransactionsByMonthController } from './controllers/GetTransactionsByMonthController';
import { GetTransactionsByMonthService } from './services/GetTransactionsByMonthService';
import { applicationTimezone } from '@/server/shared/config/env';
export function createTransactionRouter(
  wallets: WalletAccess & Pick<WalletRepositoryPort, 'findOwned'>,
  categories: CategoryAccess & Pick<CategoryRepositoryPort, 'findOwned'>,
  uow: UnitOfWork,
) {
  const repo = new TransactionRepository(wallets, categories);
  const list = new GetTransactionsByMonthController(new GetTransactionsByMonthService(repo, () => new Date(), applicationTimezone));
  const summary = new GetTransactionSummaryController(new GetTransactionSummaryService(repo, wallets, categories));
  const create = new CreateTransactionController(new CreateTransactionService(repo, wallets, categories, uow));
  const update = new UpdateTransactionController(new UpdateTransactionService(repo, wallets, categories, uow));
  const remove = new DeleteTransactionController(new DeleteTransactionService(repo, wallets, uow));
  return { list: list.handle.bind(list), summary: summary.handle.bind(summary), create: create.handle.bind(create), update: update.handle.bind(update), remove: remove.handle.bind(remove) };
}
