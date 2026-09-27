import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { CreateTransactionService } from './services/CreateTransactionService';
import { CreateTransactionController } from './controllers/CreateTransactionController';
import { UpdateTransactionService } from './services/UpdateTransactionService';
import { UpdateTransactionController } from './controllers/UpdateTransactionController';
import { DeleteTransactionService } from './services/DeleteTransactionService';
import { DeleteTransactionController } from './controllers/DeleteTransactionController';
import { TransactionRepository } from './repositories/TransactionRepository';
import type { WalletAccess, CategoryAccess } from '@/server/shared/ports/transactions';
export function createTransactionRouter(wallets: WalletAccess, categories: CategoryAccess, uow: UnitOfWork) {
  const repo = new TransactionRepository();
  const create = new CreateTransactionController(new CreateTransactionService(repo, wallets, categories, uow));
  const update = new UpdateTransactionController(new UpdateTransactionService(repo, wallets, categories, uow));
  const remove = new DeleteTransactionController(new DeleteTransactionService(repo, wallets, uow));
  return { create: create.handle.bind(create), update: update.handle.bind(update), remove: remove.handle.bind(remove) };
}
