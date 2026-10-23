import { createWalletInvitationRouter } from '../modules/wallets/invitation-router';
import { WalletInvitationService } from '../modules/wallets/services/WalletInvitationService';
import { WalletInvitationRepository } from '../modules/wallets/repositories/WalletInvitationRepository';
import { WalletPresentationService } from '../modules/wallets/services/WalletPresentationService';
import { PersonalWalletAccess } from '../modules/wallets/repositories/PersonalWalletAccess';
import { WalletMembershipRepository } from '@/server/modules/wallets/repositories/WalletMembershipRepository';
import { logged } from '@/server/shared/http/logging';
import { secure, configureAccountCheck } from '@/server/shared/http/policy';
import "server-only";
import { TransactionRepository } from '../modules/transactions/repositories/TransactionRepository';
import { DeleteCategoryService } from '../modules/categories/services/DeleteCategoryService';
import { MongoUnitOfWork } from '@/server/db/unit-of-work';
import { CategoryRepository } from '../modules/categories/repositories/CategoryRepository';
import { UserRepository } from '../modules/users/repositories/UserRepository';
import { createAuthRouter } from '../modules/auth/router';
import { hashPassword, comparePassword } from '@/server/shared/auth/crypto';
import { createCategoryRouter } from '../modules/categories/router';
import { WalletRepository } from '../modules/wallets/repositories/WalletRepository';
export const walletRepository = new WalletRepository(new WalletMembershipRepository());
const categoryRepository = new CategoryRepository();
const personalWalletAccess = new PersonalWalletAccess(walletRepository);
const transactionRepository = new TransactionRepository(personalWalletAccess, categoryRepository);
export const rawAuth = createAuthRouter(new UserRepository(), { hash: hashPassword, compare: comparePassword }, categoryRepository, new MongoUnitOfWork(), walletRepository);
export const deleteCategoryService = new DeleteCategoryService(categoryRepository, transactionRepository, new MongoUnitOfWork());
export const rawCategories = createCategoryRouter(deleteCategoryService);
import { createTransactionRouter } from '../modules/transactions/router';
import { DeleteWalletService } from '../modules/wallets/services/DeleteWalletService';
import { createWalletRouter } from '../modules/wallets/router';
export const deleteWalletService = new DeleteWalletService(walletRepository, transactionRepository, new MongoUnitOfWork());
export const rawWallets = createWalletRouter(walletRepository, deleteWalletService, new WalletPresentationService(new WalletMembershipRepository(), new UserRepository()), new UserRepository(), new MongoUnitOfWork());
export const rawTransactions = createTransactionRouter(personalWalletAccess, categoryRepository, new MongoUnitOfWork());
import { createHomeRouter } from '../modules/home/router';
export const rawHome = createHomeRouter(walletRepository, transactionRepository, categoryRepository);
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

export const rawInvitations = createWalletInvitationRouter(new WalletInvitationService(new WalletInvitationRepository(), new WalletMembershipRepository(), walletRepository, userRepository, new MongoUnitOfWork()));
