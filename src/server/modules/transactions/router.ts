import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { CreateTransactionService } from './services/CreateTransactionService';
import { CreateTransactionController } from './controllers/CreateTransactionController';
import { UpdateTransactionService } from './services/UpdateTransactionService';
import { UpdateTransactionController } from './controllers/UpdateTransactionController';
import { DeleteTransactionService } from './services/DeleteTransactionService';
import { DeleteTransactionController } from './controllers/DeleteTransactionController';
import { TransactionRepository } from './repositories/TransactionRepository';
import type { WalletAccess, CategoryAccess } from '@/server/shared/ports/transactions';
import { GetTransactionsByMonthController } from './controllers/GetTransactionsByMonthController';
import { GetTransactionsByMonthService } from './services/GetTransactionsByMonthService';
import { applicationTimezone } from '@/server/shared/config/env';
export function createTransactionRouter(wallets: WalletAccess, categories: CategoryAccess, uow: UnitOfWork) {
  const repo = new TransactionRepository();
  const list = new GetTransactionsByMonthController(new GetTransactionsByMonthService(repo, () => new Date(), applicationTimezone));
  const create = new CreateTransactionController(new CreateTransactionService(repo, wallets, categories, uow));
  const update = new UpdateTransactionController(new UpdateTransactionService(repo, wallets, categories, uow));
  const remove = new DeleteTransactionController(new DeleteTransactionService(repo, wallets, uow));
  return { list: list.handle.bind(list), create: create.handle.bind(create), update: update.handle.bind(update), remove: remove.handle.bind(remove) };
}
