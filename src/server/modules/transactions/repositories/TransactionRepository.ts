import "server-only";
import type { QueryFilter } from 'mongoose';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import { sessionOf } from '@/server/db/unit-of-work';
import Transaction, { type ITransaction } from '@/server/db/models/Transaction';
import type { TransactionRepositoryPort, TransactionInput, TransactionRecord } from '@/server/shared/ports/transactions';
import { authorizeTransactionWrite } from '@/server/db/transaction-write-guard';
import { validateReferences } from '../services/rules';
import { WalletRepository } from '../../wallets/repositories/WalletRepository';
import { CategoryRepository } from '../../categories/repositories/CategoryRepository';
function record(doc: ITransaction): TransactionRecord {
  // `title` fallback (#108): documents saved before this field existed have
  // none — surface a placeholder rather than `undefined` so every response
  // satisfies `transactionResponse`'s required `title`.
  return { id: String(doc._id), userId: String(doc.userId), walletId: String(doc.walletId), categoryId: doc.categoryId ? String(doc.categoryId) : null, type: doc.type, amount: Number(doc.amount), date: doc.date, title: doc.title ?? '(untitled)', note: doc.note };
}
export class TransactionRepository implements TransactionRepositoryPort {
  async findByDateRange(userId: string, start: Date, end: Date, search?: string) {
    const filter: QueryFilter<ITransaction> = { userId, date: { $gte: start, $lt: end } };
    if (search) {
      // Escaped so the user's text is matched literally, never as a regex (also avoids ReDoS).
      const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: pattern }, { note: pattern }];
    }
    const docs = await Transaction.find(filter).sort({ date: -1, _id: -1 });
    return docs.map(record);
  }
  async clearCategory(categoryId: string, userId: string, context: TransactionContext) {
    await authorizeTransactionWrite(Transaction.updateMany({ categoryId, userId }, { $set: { categoryId: null } }, { session: sessionOf(context) }), context);
  }
  async removeByWallet(walletId: string, userId: string, context: TransactionContext) {
    await authorizeTransactionWrite(Transaction.deleteMany({ walletId, userId }, { session: sessionOf(context) }), context);
  }
  async findOwned(id: string, userId: string, context: TransactionContext) {
    const doc = await Transaction.findOne({ _id: id, userId }).session(sessionOf(context)!); return doc ? record(doc) : null;
  }
  async create(userId: string, input: TransactionInput, context: TransactionContext) {
    const doc = authorizeTransactionWrite(new Transaction({ ...input, userId }), context);
    await validateReferences(input, userId, new WalletRepository(), new CategoryRepository(), context);
    return record(await doc.save({ session: sessionOf(context) }));
  }
  async update(id: string, userId: string, input: TransactionInput, context: TransactionContext) {
    const doc = await Transaction.findOne({ _id: id, userId }).session(sessionOf(context)!);
    if (!doc) return null;
    Object.assign(doc, input);
    authorizeTransactionWrite(doc, context);
    await validateReferences(record(doc), userId, new WalletRepository(), new CategoryRepository(), context);
    return record(await doc.save({ session: sessionOf(context) }));
  }
  async remove(id: string, userId: string, context: TransactionContext) {
    const doc = await authorizeTransactionWrite(Transaction.findOneAndDelete({ _id: id, userId }, { session: sessionOf(context) }), context); return doc ? record(doc) : null;
  }
}
