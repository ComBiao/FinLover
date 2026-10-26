import "server-only";
import { Types, type QueryFilter } from 'mongoose';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import { sessionOf } from '@/server/db/unit-of-work';
import Transaction, { type ITransaction } from '@/server/db/models/Transaction';
import Wallet from '@/server/db/models/Wallet';
import type { TransactionRepositoryPort, TransactionInput, TransactionRecord, TransactionSummaryFilter, TransactionSummaryReader, TransactionReportFilter, TransactionReportReader, WalletAccess, CategoryAccess } from '@/server/shared/ports/transactions';
import { authorizeTransactionWrite } from '@/server/db/transaction-write-guard';
import { validateReferences } from '../services/rules';

function record(doc: ITransaction): TransactionRecord {
  // `title` fallback (#108): documents saved before this field existed have
  // none — surface a placeholder rather than `undefined` so every response
  // satisfies `transactionResponse`'s required `title`.
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    walletId: String(doc.walletId),
    categoryId: doc.categoryId ? String(doc.categoryId) : null,
    categoryKey: doc.categoryKey ?? null,
    type: doc.type,
    amount: Number(doc.amount),
    date: doc.date,
    title: doc.title ?? '(untitled)',
    note: doc.note,
    updatedBy: doc.updatedBy ? String(doc.updatedBy) : undefined,
  };
}

// Aggregation pipelines skip schema casting, so ids are converted here.
const objectId = (value: string) => new Types.ObjectId(value);
const dateRange = (start: Date, end?: Date) => end ? { $gte: start, $lt: end } : { $gte: start };

/** Case-insensitive title/note match. Escaped so the user's text is matched literally, never as a regex (also avoids ReDoS). */
function searchFilter(search: string) {
  const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return [{ title: pattern }, { notes: pattern }]; // `notes` is the stored path; the `note` alias isn't translated in query filters
}

export class TransactionRepository implements TransactionRepositoryPort, TransactionSummaryReader, TransactionReportReader {
  constructor(private wallets: WalletAccess, private categories: CategoryAccess) {}

  async findByDateRange(userId: string, start: Date, end: Date, search?: string) {
    const personalWallets = await Wallet.find({ userId, isShared: { $ne: true } }).select('_id');
    const personalWalletIds = personalWallets.map(w => w._id);
    const filter: QueryFilter<ITransaction> = {
      userId,
      walletId: { $in: personalWalletIds },
      date: { $gte: start, $lt: end },
    };
    if (search) filter.$or = searchFilter(search);
    const docs = await Transaction.find(filter).sort({ date: -1, _id: -1 });
    return docs.map(record);
  }

  async findByWalletAndDateRange(walletId: string, start: Date, end: Date) {
    const docs = await Transaction.find({ walletId, date: { $gte: start, $lt: end } }).sort({ date: -1, _id: -1 });
    return docs.map(record);
  }

  async sumByType(userId: string, { start, end, walletId, walletIds, type, categoryIds, search }: TransactionSummaryFilter) {
    const match: Record<string, unknown> = { userId: objectId(userId), date: dateRange(start, end) };
    const personalWalletIds = await this.personalWalletIds(userId);
    if (walletId) {
      const targetId = objectId(walletId);
      if (!personalWalletIds.some(pid => pid.equals(targetId))) {
        return { income: 0, expense: 0, count: 0 };
      }
      match.walletId = targetId;
    } else {
      match.walletId = { $in: walletIds ? personalWalletIds.filter(pid => walletIds.includes(String(pid))) : personalWalletIds };
    }
    if (type) match.type = type;
    if (categoryIds) match.categoryId = { $in: categoryIds.map(value => value === null ? null : objectId(value)) };
    if (search) match.$or = searchFilter(search);
    const groups: { _id: string; total: number; count: number }[] = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const total = (key: string) => groups.find(group => group._id === key)?.total ?? 0;
    return { income: total('income'), expense: total('expense'), count: groups.reduce((sum, group) => sum + group.count, 0) };
  }

  async totalsByDay(userId: string, filter: TransactionReportFilter) {
    const groups: { _id: string; income: number; expense: number }[] = await Transaction.aggregate([
      { $match: await this.reportMatch(userId, filter) },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' } },
        income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
        expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
      } },
      { $sort: { _id: 1 } },
    ]);
    return groups.map(group => ({ date: group._id, income: group.income, expense: group.expense }));
  }

  async totalsByCategory(userId: string, filter: TransactionReportFilter) {
    const groups: { _id: { categoryId: Types.ObjectId | null; type: 'income' | 'expense' }; amount: number }[] = await Transaction.aggregate([
      { $match: await this.reportMatch(userId, filter) },
      { $group: { _id: { categoryId: { $ifNull: ['$categoryId', null] }, type: '$type' }, amount: { $sum: '$amount' } } },
    ]);
    return groups.map(group => ({ categoryId: group._id.categoryId ? String(group._id.categoryId) : null, type: group._id.type, amount: group.amount }));
  }

  /** Same personal-wallet scope as sumByType, so report totals agree with the Home and Transactions pages. */
  private async reportMatch(userId: string, { start, end, walletIds }: TransactionReportFilter) {
    const personalWalletIds = await this.personalWalletIds(userId);
    return { userId: objectId(userId), walletId: { $in: personalWalletIds.filter(pid => walletIds.includes(String(pid))) }, date: dateRange(start, end) };
  }

  private async personalWalletIds(userId: string) {
    return (await Wallet.find({ userId, isShared: { $ne: true } }).select('_id')).map(w => w._id as Types.ObjectId);
  }

  async clearCategory(categoryId: string, userId: string, context: TransactionContext) {
    await authorizeTransactionWrite(Transaction.updateMany({ categoryId, userId }, { $set: { categoryId: null } }, { session: sessionOf(context) }), context);
  }

  async removeByWallet(walletId: string, _userId: string, context: TransactionContext) {
    await authorizeTransactionWrite(Transaction.deleteMany({ walletId }, { session: sessionOf(context) }), context);
  }

  async findById(id: string, context: TransactionContext) {
    const doc = await Transaction.findById(id).session(sessionOf(context)!);
    return doc ? record(doc) : null;
  }

  async findOwned(id: string, userId: string, context: TransactionContext) {
    const doc = await Transaction.findOne({ _id: id, userId }).session(sessionOf(context)!);
    return doc ? record(doc) : null;
  }

  async create(userId: string, input: TransactionInput, context: TransactionContext) {
    const doc = authorizeTransactionWrite(new Transaction({ ...input, userId }), context);
    await validateReferences(input, userId, this.wallets, this.categories, context);
    return record(await doc.save({ session: sessionOf(context) }));
  }

  async update(id: string, input: TransactionInput, context: TransactionContext, actorUserId?: string): Promise<TransactionRecord | null>;
  async update(id: string, userId: string, input: TransactionInput, context: TransactionContext): Promise<TransactionRecord | null>;
  async update(id: string, arg2: string | TransactionInput, arg3: TransactionInput | TransactionContext, arg4?: TransactionContext | string): Promise<TransactionRecord | null> {
    const isUserFirst = typeof arg2 === 'string';
    const actorUserId = isUserFirst ? arg2 : (typeof arg4 === 'string' ? arg4 : undefined);
    const input = (isUserFirst ? arg3 : arg2) as TransactionInput;
    const context = (isUserFirst ? arg4 : arg3) as TransactionContext;

    const doc = await Transaction.findById(id).session(sessionOf(context)!);
    if (!doc) return null;
    if (input.updatedBy) doc.updatedBy = new Types.ObjectId(input.updatedBy);
    if (input.walletId) doc.walletId = new Types.ObjectId(input.walletId);
    if (input.categoryId !== undefined) doc.categoryId = input.categoryId ? new Types.ObjectId(input.categoryId) : null;
    if (input.categoryKey !== undefined) doc.categoryKey = input.categoryKey ?? undefined;
    if (input.type) doc.type = input.type;
    if (input.amount !== undefined) doc.amount = input.amount;
    if (input.date) doc.date = input.date;
    if (input.title) doc.title = input.title;
    doc.note = input.note;
    authorizeTransactionWrite(doc, context);
    if (actorUserId) {
      await validateReferences(record(doc), actorUserId, this.wallets, this.categories, context);
    }
    return record(await doc.save({ session: sessionOf(context) }));
  }

  async remove(id: string, context: TransactionContext): Promise<TransactionRecord | null>;
  async remove(id: string, userId: string, context: TransactionContext): Promise<TransactionRecord | null>;
  async remove(id: string, arg2: string | TransactionContext, arg3?: TransactionContext): Promise<TransactionRecord | null> {
    const context = (typeof arg2 === 'string' ? arg3 : arg2) as TransactionContext;
    const doc = await authorizeTransactionWrite(Transaction.findByIdAndDelete(id, { session: sessionOf(context) }), context);
    return doc ? record(doc) : null;
  }
}
