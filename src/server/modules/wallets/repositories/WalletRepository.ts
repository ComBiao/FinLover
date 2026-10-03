import "server-only";
import Wallet from '@/server/db/models/Wallet';
import { sessionOf } from '@/server/db/unit-of-work';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import type { WalletAccess } from '@/server/shared/ports/transactions';
import type { WalletCreateInput, WalletRecord, WalletRepositoryPort, WalletUpdateInput } from '@/server/shared/ports/wallets';
import { AppError } from '@/server/shared/kernel/AppError';

function toRecord(doc: InstanceType<typeof Wallet>): WalletRecord {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    name: doc.name,
    balance: doc.balance,
    isDefault: doc.isDefault,
    color: doc.color,
    isSaving: doc.isSaving,
    goalAmount: doc.goalAmount,
    hideBalance: doc.hideBalance,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

export class WalletRepository implements WalletAccess, WalletRepositoryPort {
  async exists(id: string, userId: string, context: TransactionContext) { return !!(await Wallet.findOne({ _id: id, userId }).session(sessionOf(context)!).lean()); }
  async adjust(id: string, userId: string, delta: number, context: TransactionContext) {
    const result = await Wallet.updateOne({ _id: id, userId }, { $inc: { balance: delta } }, { session: sessionOf(context) });
    if (!result.matchedCount) throw new AppError('NOT_FOUND', 'Wallet not found');
  }
  async list(userId: string, context?: TransactionContext) {
    const docs = await Wallet.find({ userId }).sort({ isDefault: -1, createdAt: 1 }).session(sessionOf(context) ?? null);
    return docs.map(toRecord);
  }
  async findOwned(id: string, userId: string, context?: TransactionContext) {
    const doc = await Wallet.findOne({ _id: id, userId }).session(sessionOf(context) ?? null);
    return doc ? toRecord(doc) : null;
  }
  async create(userId: string, input: WalletCreateInput) { return toRecord(await Wallet.create({ ...input, userId })); }
  async update(id: string, userId: string, input: WalletUpdateInput) {
    const doc = await Wallet.findOne({ _id: id, userId });
    if (!doc) return null;
    Object.assign(doc, input);
    return toRecord(await doc.save());
  }
  async delete(id: string, userId: string, context: TransactionContext) {
    return Wallet.findOneAndDelete({ _id: id, userId }, { session: sessionOf(context) });
  }
}
