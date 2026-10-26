import { categoryInput, categoryUpdate, transactionInput, transactionUpdate, walletSavingUpdate, loginSchema, registerSchema } from '@/shared/contracts';
import { versioned } from '@/server/shared/http/versioned';
import { rawAuth as auth, rawCategories as categories, rawTransactions as transactions, rawWallets, rawHome, rawReports, rawInvitations, rawMembers, rawSchedulers, rawUsers } from '@/server/composition';

const txInput = (value: Record<string, unknown>) => {
  const res: Record<string, unknown> = {
    wallet_id: value.walletId,
    type: value.type === 'income' ? 'Income' : value.type === 'expense' ? 'Expense' : value.type,
    amount: value.amount,
    date: value.date,
    title: value.title,
    note: value.note,
  };
  if ('categoryId' in value && value.categoryId !== undefined) {
    res.category_id = value.categoryId;
  }
  if ('categoryKey' in value && value.categoryKey !== undefined) res.category_key = value.categoryKey;
  return res;
};
const txUpdateInput = (value: Record<string, unknown>) => {
  const res: Record<string, unknown> = {
    type: value.type === 'income' ? 'Income' : value.type === 'expense' ? 'Expense' : value.type,
    amount: value.amount,
    date: value.date,
    title: value.title,
    note: value.note,
  };
  if ('walletId' in value && value.walletId !== undefined) res.wallet_id = value.walletId;
  if ('categoryId' in value && value.categoryId !== undefined) res.category_id = value.categoryId;
  if ('categoryKey' in value && value.categoryKey !== undefined) res.category_key = value.categoryKey;
  return res;
};
const txOutput = (value: Record<string, unknown>) => {
  if (value.createdBy) {
    const res: Record<string, unknown> = {
      id: value.id,
      walletId: value.walletId ?? value.wallet_id,
      type: value.type,
      amount: value.amount,
      date: value.date,
      title: value.title,
      createdBy: value.createdBy,
      category: value.category,
    };
    if (value.note !== undefined && value.note !== null) res.note = value.note;
    if (value.editedBy) res.editedBy = value.editedBy;
    return res;
  }
  return {
    id: value.id,
    walletId: value.wallet_id ?? value.walletId,
    categoryId: value.category_id ?? value.categoryId ?? null,
    type: value.type,
    amount: value.amount,
    date: value.date,
    title: value.title,
    ...(value.note !== undefined && value.note !== null ? { note: value.note } : {}),
  };
};
const categoryOutput = (value: Record<string, unknown>) => ({ id: String(value._id), name: value.name, type: value.type, color: value.color, icon: value.icon, isSystem: value.isSystem, createdAt: value.createdAt, updatedAt: value.updatedAt });
const walletOutput = (value: Record<string, unknown>) => ({ id: value.id, name: value.name, balance: value.balance, isDefault: value.isDefault, color: value.color, icon: value.icon, isSaving: value.isSaving, goalAmount: value.goalAmount, createdAt: value.createdAt, updatedAt: value.updatedAt, isShared: value.isShared, role: value.role, memberCount: value.memberCount, membersPreview: value.membersPreview, ownerName: value.ownerName });
export const v1 = {
  listWalletMembers: versioned(rawMembers.list, { protected: true }),
  removeWalletMember: versioned(rawMembers.remove, { protected: true }),
  leaveWallet: versioned(rawMembers.leave, { protected: true }),
  transferWalletOwnership: versioned(rawMembers.transfer, { protected: true, output: walletOutput }),
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
  listSharedWalletTransactions: versioned(rawWallets.listTransactions, { protected: true }),
  transactionSummary: versioned(transactions.summary, { protected: true }),
  createTransaction: versioned(transactions.create, { protected: true, schema: transactionInput, input: txInput, output: txOutput }),
  updateTransaction: versioned(transactions.update, { protected: true, schema: transactionUpdate, input: txUpdateInput, output: txOutput }),
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
  reportSummary: versioned(rawReports.summary, { protected: true }),
  reportCashFlow: versioned(rawReports.cashFlow, { protected: true }),
  reportCategoryDistribution: versioned(rawReports.categoryDistribution, { protected: true }),
  reportRunningBalance: versioned(rawReports.runningBalance, { protected: true }),
  lookupUser: versioned(rawUsers.lookup, { protected: true }),
};
