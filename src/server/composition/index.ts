import { logged } from '@/server/shared/http/logging';
import { secure } from '@/server/shared/http/policy';
import "server-only";
import { TransactionRepository } from '../modules/transactions/repositories/TransactionRepository';
import { DeleteCategoryService } from '../modules/categories/services/DeleteCategoryService';
import { MongoUnitOfWork } from '@/server/db/unit-of-work';
import { CategoryRepository } from '../modules/categories/repositories/CategoryRepository';
import { UserRepository } from '../modules/users/repositories/UserRepository';
import { createAuthRouter } from '../modules/auth/router';
import { hashPassword, comparePassword } from '@/server/shared/auth/crypto';
export const rawAuth = createAuthRouter(new UserRepository(), { hash: hashPassword, compare: comparePassword });
import { createCategoryRouter } from '../modules/categories/router';
export const deleteCategoryService = new DeleteCategoryService(new CategoryRepository(), new TransactionRepository(), new MongoUnitOfWork());
export const rawCategories = createCategoryRouter(deleteCategoryService);
import { createTransactionRouter } from '../modules/transactions/router';
import { WalletRepository } from '../modules/wallets/repositories/WalletRepository';
export const walletRepository = new WalletRepository();
import { createWalletRouter } from '../modules/wallets/router';
export const rawWallets = createWalletRouter(walletRepository);
export const rawTransactions = createTransactionRouter(walletRepository, new CategoryRepository(), new MongoUnitOfWork());



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
};
