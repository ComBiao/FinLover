import { logged } from '@/server/shared/http/logging';
import { secure, configureAccountCheck } from '@/server/shared/http/policy';
import "server-only";
import { TransactionRepository } from '../modules/transactions/repositories/TransactionRepository';
import { DeleteCategoryService } from '../modules/categories/services/DeleteCategoryService';
import { MongoUnitOfWork } from '@/server/db/unit-of-work';
import { SchedulerRepository } from '../modules/schedulers/repositories/SchedulerRepository';
import { CategoryRepository } from '../modules/categories/repositories/CategoryRepository';
import { UserRepository } from '../modules/users/repositories/UserRepository';
import { createAuthRouter } from '../modules/auth/router';
import { hashPassword, comparePassword } from '@/server/shared/auth/crypto';
import { createCategoryRouter } from '../modules/categories/router';
import { WalletRepository } from '../modules/wallets/repositories/WalletRepository';
export const walletRepository = new WalletRepository();
const categoryRepository = new CategoryRepository();
export const rawAuth = createAuthRouter(new UserRepository(), { hash: hashPassword, compare: comparePassword }, categoryRepository, new MongoUnitOfWork(), walletRepository);
const schedulerRepository = new SchedulerRepository();
const transactionRepository = new TransactionRepository();
// Deleting a category clears it from Transactions and moves Schedulers (which need a category) to "Others".
export const deleteCategoryService = new DeleteCategoryService(categoryRepository, {
  async clearCategory(id, userId, context) {
    await transactionRepository.clearCategory(id, userId, context);
    await schedulerRepository.reassignCategory(id, userId, type => categoryRepository.fallbackId(userId, type, context), context);
  },
}, new MongoUnitOfWork());
export const rawCategories = createCategoryRouter(deleteCategoryService);
import { createTransactionRouter } from '../modules/transactions/router';
import { DeleteWalletService } from '../modules/wallets/services/DeleteWalletService';
import { createWalletRouter } from '../modules/wallets/router';
export const deleteWalletService = new DeleteWalletService(walletRepository, new TransactionRepository(), new MongoUnitOfWork());
export const rawWallets = createWalletRouter(walletRepository, deleteWalletService);
export const rawTransactions = createTransactionRouter(walletRepository, categoryRepository, new MongoUnitOfWork());
import { createSchedulerRouter } from '../modules/schedulers/router';
import { CreateTransactionService } from '../modules/transactions/services/CreateTransactionService';
export const rawSchedulers = createSchedulerRouter(
  schedulerRepository, walletRepository, categoryRepository,
  new CreateTransactionService(new TransactionRepository(), walletRepository, categoryRepository, new MongoUnitOfWork()),
  new MongoUnitOfWork(),
);
import { createHomeRouter } from '../modules/home/router';
export const rawHome = createHomeRouter(walletRepository, new TransactionRepository(), categoryRepository);
import { connectDB } from '@/server/db/index';

const userRepository = new UserRepository();

export const auth = {
  login: logged(secure(rawAuth.login, { browserAuth: true })),
  register: logged(secure(rawAuth.register, { browserAuth: true })),
  logout: logged(secure(rawAuth.logout, { browserAuth: true })),
};
export const categories = {
  create: logged(secure(rawCategories.create, { protected: true })),
  update: logged(secure(rawCategories.update, { protected: true })),
  remove: logged(secure(rawCategories.remove, { protected: true })),
};
export const transactions = {
  list: logged(secure(rawTransactions.list, { protected: true })),
  create: logged(secure(rawTransactions.create, { protected: true })),
  update: logged(secure(rawTransactions.update, { protected: true })),
  remove: logged(secure(rawTransactions.remove, { protected: true })),
};
export const wallets = {
  create: logged(secure(rawWallets.create, { protected: true })),
  list: logged(secure(rawWallets.list, { protected: true })),
  get: logged(secure(rawWallets.get, { protected: true })),
  update: logged(secure(rawWallets.update, { protected: true })),
  updateSaving: logged(secure(rawWallets.updateSaving, { protected: true })),
  remove: logged(secure(rawWallets.remove, { protected: true })),
};
export const accountExists = async (userId: string) => {
  await connectDB();
  return userRepository.existsById(userId);
};
configureAccountCheck(accountExists);
