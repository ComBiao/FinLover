import 'server-only';
import WalletMember, { type IWalletMember } from '@/server/db/models/WalletMember';
import type { Types } from 'mongoose';
import { sessionOf } from '@/server/db/unit-of-work';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import type { WalletInvitationRepositoryPort } from '@/server/shared/ports/wallet-membership';
import { AppError } from '@/server/shared/kernel/AppError';

const record = (row: IWalletMember & { _id: Types.ObjectId }) => ({
  id: String(row._id), walletId: String(row.walletId), userId: String(row.userId),
  invitedBy: String(row.invitedBy), status: row.status, createdAt: row.createdAt,
});
export class WalletInvitationRepository implements WalletInvitationRepositoryPort {
  async create(walletId: string, userId: string, invitedBy: string, context: TransactionContext) {
    try {
      const [row] = await WalletMember.create([{ walletId, userId, invitedBy, status: 'pending' }], { session: sessionOf(context) });
      return record(row);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        throw new AppError('CONFLICT', 'User is already invited or a member');
      }
      throw error;
    }
  }
  async find(id: string, context: TransactionContext) {
    const row = await WalletMember.findById(id).session(sessionOf(context)!).lean();
    return row ? record(row) : null;
  }
  async listPending(userId: string) {
    return (await WalletMember.find({ userId, status: 'pending' }).sort({ createdAt: -1, _id: -1 }).lean()).map(record);
  }
  async accept(id: string, userId: string, context: TransactionContext) {
    const result = await WalletMember.updateOne({ _id: id, userId, status: 'pending' }, { $set: { status: 'accepted' } }, { session: sessionOf(context) });
    return result.modifiedCount === 1;
  }
  async decline(id: string, userId: string, context: TransactionContext) {
    const result = await WalletMember.deleteOne({ _id: id, userId, status: 'pending' }, { session: sessionOf(context) });
    return result.deletedCount === 1;
  }
}
