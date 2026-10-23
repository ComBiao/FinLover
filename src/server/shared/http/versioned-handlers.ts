import { categoryInput, categoryUpdate, transactionInput, transactionUpdate, walletSavingUpdate, loginSchema, registerSchema } from '@/shared/contracts';
import { versioned } from '@/server/shared/http/versioned';
import { rawAuth as auth, rawCategories as categories, rawTransactions as transactions, rawWallets, rawHome, rawInvitations, rawSchedulers } from '@/server/composition';
const txInput = (value: Record<string, unknown>) => ({ wallet_id: value.walletId, category_id: value.categoryId, type: value.type === 'income' ? 'Income' : 'Expense', amount: value.amount, date: value.date, title: value.title, note: value.note });
const txOutput = (value: Record<string, unknown>) => ({ id: value.id, walletId: value.wallet_id, categoryId: value.category_id, type: value.type, amount: value.amount, date: value.date, title: value.title, note: value.note });
const categoryOutput = (value: Record<string, unknown>) => ({ id: String(value._id), name: value.name, type: value.type, color: value.color, icon: value.icon, isSystem: value.isSystem, createdAt: value.createdAt, updatedAt: value.updatedAt });
const walletOutput = (value: Record<string, unknown>) => ({ id: value.id, name: value.name, balance: value.balance, isDefault: value.isDefault, color: value.color, icon: value.icon, isSaving: value.isSaving, goalAmount: value.goalAmount, createdAt: value.createdAt, updatedAt: value.updatedAt, isShared: value.isShared, role: value.role, memberCount: value.memberCount, membersPreview: value.membersPreview, ownerName: value.ownerName });
export const v1 = {
  inviteWalletMember: versioned(rawInvitations.invite, { protected: true }),
  listInvitations: versioned(rawInvitations.list, { protected: true }),
  acceptInvitation: versioned(rawInvitations.accept, { protected: true }),
  declineInvitation: versioned(rawInvitations.decline, { protected: true }),
  login: versioned(auth.login, { schema: loginSchema, browserAuth: true }),
  register: versioned(auth.register, { schema: registerSchema, browserAuth: true }),
  logout: versioned(auth.logout, { browserAuth: true }),
  me: versioned(auth.me, { protected: true }),
  deleteAccount: versioned(auth.deleteAccount, { protected: true, allowMissingAccount: true }),
  listCategories: versioned(categories.list, { protected: true, output: categoryOutput }),
  createCategory: versioned(categories.create, { protected: true, schema: categoryInput, output: categoryOutput }),
  updateCategory: versioned(categories.update, { protected: true, schema: categoryUpdate, output: categoryOutput }),
  deleteCategory: versioned(categories.remove, { protected: true, output: categoryOutput }),
  listTransactions: versioned(transactions.list, { protected: true }),
  transactionSummary: versioned(transactions.summary, { protected: true }),
  createTransaction: versioned(transactions.create, { protected: true, schema: transactionInput, input: txInput, output: txOutput }),
  updateTransaction: versioned(transactions.update, { protected: true, schema: transactionUpdate, input: txInput, output: txOutput }),
  deleteWallet: versioned(rawWallets.remove, { protected: true }),
  deleteTransaction: versioned(transactions.remove, { protected: true }),
  createWallet: versioned(rawWallets.create, { protected: true, output: walletOutput }),
  listWallets: versioned(rawWallets.list, { protected: true, output: walletOutput }),
  getWallet: versioned(rawWallets.get, { protected: true, output: walletOutput }),
  updateWallet: versioned(rawWallets.update, { protected: true, output: walletOutput }),
  updateWalletSaving: versioned(rawWallets.updateSaving, { protected: true, schema: walletSavingUpdate, output: walletOutput }),
  listSchedulers: versioned(rawSchedulers.list, { protected: true }),
  createScheduler: versioned(rawSchedulers.create, { protected: true }),
  getScheduler: versioned(rawSchedulers.get, { protected: true }),
  updateScheduler: versioned(rawSchedulers.update, { protected: true }),
  setSchedulerStatus: versioned(rawSchedulers.setStatus, { protected: true }),
  deleteScheduler: versioned(rawSchedulers.remove, { protected: true }),
  homeSummary: versioned(rawHome.summary, { protected: true }),
};
