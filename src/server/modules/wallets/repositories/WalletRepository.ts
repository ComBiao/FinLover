import "server-only";
import Wallet from '@/server/db/models/Wallet';
import { sessionOf } from '@/server/db/unit-of-work';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import type { WalletAccess } from '@/server/shared/ports/transactions';
import type { WalletCreateInput, WalletRecord, WalletRepositoryPort, WalletSavingInput, WalletUpdateInput } from '@/server/shared/ports/wallets';
import type { WalletMembershipPort } from '@/server/shared/ports/wallet-membership';
import { AppError } from '@/server/shared/kernel/AppError';

function toRecord(doc: InstanceType<typeof Wallet>): WalletRecord {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    name: doc.name,
    balance: doc.balance,
    isDefault: doc.isDefault,
    isShared: doc.isShared === true,
    color: doc.color,
    icon: doc.icon,
    isSaving: doc.isSaving,
    goalAmount: doc.goalAmount,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

export class WalletRepository implements WalletAccess, WalletRepositoryPort {
  constructor(private memberships: WalletMembershipPort) {}
  async exists(id: string, userId: string, context: TransactionContext) {
    const wallet = await Wallet.findById(id).session(sessionOf(context)!);
    if (!wallet) return false;
    const role = await this.memberships.roleOf(id, userId, context);
    if (!role && wallet.isShared) throw new AppError('FORBIDDEN', 'Only wallet members can access this wallet');
    return role !== null;
  }
  async adjust(id: string, userId: string, delta: number, context: TransactionContext) {
    if (!await this.exists(id, userId, context)) throw new AppError('NOT_FOUND', 'Wallet not found');
    const result = await Wallet.updateOne({ _id: id }, { $inc: { balance: delta } }, { session: sessionOf(context) });
    if (!result.matchedCount) throw new AppError('NOT_FOUND', 'Wallet not found');
  }
  async findByIds(ids: string[], context?: TransactionContext) {
    return (await Wallet.find({ _id: { $in: ids } }).sort({ isDefault: -1, createdAt: 1, _id: 1 }).session(sessionOf(context) ?? null)).map(toRecord);
  }
  async listAccessible(userId: string) {
    return this.findByIds(await this.memberships.listAccessible(userId));
  }
  async findAccessible(id: string, userId: string, context?: TransactionContext) {
    if (!/^[a-f0-9]{24}$/i.test(id)) throw new AppError('VALIDATION_ERROR', 'Invalid wallet ID', { id: 'must be a valid ObjectId' });
    const wallet = await Wallet.findById(id).session(sessionOf(context) ?? null);
    if (!wallet) throw new AppError('NOT_FOUND', 'Wallet not found');
    if (!await this.memberships.roleOf(id, userId, context)) {
      throw new AppError(wallet.isShared ? 'FORBIDDEN' : 'NOT_FOUND', wallet.isShared ? 'Only wallet members can access this wallet' : 'Wallet not found');
    }
    return toRecord(wallet);
  }
  async list(userId: string, context?: TransactionContext) {
    const docs = await Wallet.find({ userId }).sort({ isDefault: -1, createdAt: 1 }).session(sessionOf(context) ?? null);
    return docs.map(toRecord);
  }
  async findOwned(id: string, userId: string, context?: TransactionContext) {
    const doc = await Wallet.findById(id).session(sessionOf(context) ?? null);
    if (doc && String(doc.userId) !== userId) {
      if (doc.isShared) throw new AppError('FORBIDDEN', 'Only the wallet owner can perform this action');
      return null;
    }
    return doc ? toRecord(doc) : null;
  }
  async create(userId: string, input: WalletCreateInput, context?: TransactionContext) {
    const [wallet] = await Wallet.create([{ ...input, userId, balance: 0, isDefault: false }], { session: sessionOf(context) });
    return toRecord(wallet);
  }
  async update(id: string, userId: string, input: WalletUpdateInput) {
    const doc = await Wallet.findOne({ _id: id, userId });
    if (!doc) return null;
    Object.assign(doc, input);
    return toRecord(await doc.save());
  }
  async setSaving(id: string, userId: string, input: WalletSavingInput) {
    const doc = await Wallet.findOne({ _id: id, userId });
    if (!doc) return null;
    doc.isSaving = input.isSaving;
    doc.goalAmount = input.isSaving ? input.goalAmount : undefined;
    return toRecord(await doc.save());
  }
  async delete(id: string, userId: string, context: TransactionContext) {
    await this.memberships.lockWallet(id, context);
    return Wallet.findOneAndDelete({ _id: id, userId }, { session: sessionOf(context) });
  }
  async createDefault(userId: string, context?: TransactionContext) {
    const session = sessionOf(context);
    const docs = await Wallet.create(
      [
        {
          userId,
          name: 'Cash',
          balance: 0,
          isDefault: true,
          color: '#4A4757',
          icon: 'Wallet',
          isSaving: false,
        },
      ],
      session ? { session } : undefined,
    );
    return toRecord(docs[0]);
  }
}
