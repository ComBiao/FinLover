import { categoryInput, categoryUpdate, transactionInput, transactionUpdate, loginSchema, registerSchema } from '@/shared/contracts';
import { versioned } from '@/server/shared/http/versioned';
import { rawAuth as auth, rawCategories as categories, rawTransactions as transactions } from '@/server/composition';
const txInput = (value: Record<string, unknown>) => ({ wallet_id: value.walletId, category_id: value.categoryId, type: value.type === 'income' ? 'Income' : 'Expense', amount: value.amount, date: value.date, note: value.note });
const txOutput = (value: Record<string, unknown>) => ({ id: value.id, walletId: value.wallet_id, categoryId: value.category_id, type: value.type, amount: value.amount, date: value.date, note: value.note });
const categoryOutput = (value: Record<string, unknown>) => ({ id: String(value._id), name: value.name, type: value.type, color: value.color, isSystem: value.isSystem, createdAt: value.createdAt, updatedAt: value.updatedAt });
export const v1 = {
  login: versioned(auth.login, { schema: loginSchema, browserAuth: true }),
  register: versioned(auth.register, { schema: registerSchema, browserAuth: true }),
  logout: versioned(auth.logout, { browserAuth: true }),
  deleteAccount: versioned(auth.deleteAccount, { protected: true }),
  createCategory: versioned(categories.create, { protected: true, schema: categoryInput, output: categoryOutput }),
  updateCategory: versioned(categories.update, { protected: true, schema: categoryUpdate, output: categoryOutput }),
  deleteCategory: versioned(categories.remove, { protected: true, output: categoryOutput }),
  createTransaction: versioned(transactions.create, { protected: true, schema: transactionInput, input: txInput, output: txOutput }),
  updateTransaction: versioned(transactions.update, { protected: true, schema: transactionUpdate, input: txInput, output: txOutput }),
  deleteTransaction: versioned(transactions.remove, { protected: true }),
};
