import "server-only";
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import { sessionOf } from '@/server/db/unit-of-work';
import Transaction, { type ITransaction } from '@/server/db/models/Transaction';
import type { TransactionRepositoryPort, TransactionInput, TransactionRecord } from '@/server/shared/ports/transactions';
function record(doc: ITransaction): TransactionRecord {
  return { id: String(doc._id), userId: String(doc.userId), walletId: String(doc.walletId), categoryId: doc.categoryId ? String(doc.categoryId) : null, type: doc.type, amount: Number(doc.amount), date: doc.date, note: doc.note };
}
export class TransactionRepository implements TransactionRepositoryPort {
  async clearCategory(categoryId: string, userId: string, context: TransactionContext) {
    await Transaction.updateMany({ categoryId, userId }, { $set: { categoryId: null } }, { session: sessionOf(context) });
  }
  async findOwned(id: string, userId: string, context: TransactionContext) {
    const doc = await Transaction.findOne({ _id: id, userId }).session(sessionOf(context)!); return doc ? record(doc) : null;
  }
  async create(userId: string, input: TransactionInput, context: TransactionContext) { return record((await Transaction.create([{ ...input, userId }], { session: sessionOf(context) }))[0]); }
  async update(id: string, userId: string, input: TransactionInput, context: TransactionContext) {
    const doc = await Transaction.findOne({ _id: id, userId }).session(sessionOf(context)!);
    if (!doc) return null;
    Object.assign(doc, input); return record(await doc.save({ session: sessionOf(context) }));
  }
  async remove(id: string, userId: string, context: TransactionContext) {
    const doc = await Transaction.findOneAndDelete({ _id: id, userId }, { session: sessionOf(context) }); return doc ? record(doc) : null;
  }
}
