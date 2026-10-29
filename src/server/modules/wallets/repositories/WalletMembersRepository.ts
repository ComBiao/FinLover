import 'server-only';
import Wallet from '@/server/db/models/Wallet';
import WalletMember from '@/server/db/models/WalletMember';
import { sessionOf } from '@/server/db/unit-of-work';
import { AppError } from '@/server/shared/kernel/AppError';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import type { WalletMembersPort } from '@/server/shared/ports/wallet-members';

export class WalletMembersRepository implements WalletMembersPort {
  constructor(
    private schedulers?: { cancelByCreatorAndWallet(userId: string, walletId: string, context: TransactionContext): Promise<void> },
  ) {}

  async list(walletId: string, context: TransactionContext) {
    const rows = await WalletMember.find({ walletId }).sort({ createdAt: 1, _id: 1 }).session(sessionOf(context)!).lean();
    return rows.map(row => ({ userId: String(row.userId), status: row.status }));
  }
  async remove(walletId: string, userId: string, context: TransactionContext) {
    if (this.schedulers) {
      await this.schedulers.cancelByCreatorAndWallet(userId, walletId, context);
    }
    const result = await WalletMember.deleteOne({ walletId, userId }, { session: sessionOf(context) });
    return result.deletedCount === 1;
  }
  async transfer(walletId: string, ownerId: string, nextOwnerId: string, context: TransactionContext) {
    const session = sessionOf(context);
    if (!session?.inTransaction()) throw new Error('Ownership transfer requires an active UnitOfWork');
    try {
      const changed = await Wallet.updateOne({ _id: walletId, userId: ownerId, isShared: true }, { $set: { userId: nextOwnerId } }, { session });
      if (!changed.matchedCount) throw new AppError('CONFLICT', 'Wallet ownership has changed');
      const removed = await WalletMember.deleteOne({ walletId, userId: nextOwnerId, status: 'accepted' }, { session });
      if (!removed.deletedCount) throw new AppError('CONFLICT', 'New owner must be an accepted Contributor');
      // Owner is stored only on Wallet. Preserve the actor as invitedBy for the
      // former owner's newly-created accepted membership (no invitation sent).
      await WalletMember.create([{ walletId, userId: ownerId, status: 'accepted', invitedBy: ownerId }], { session });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        throw new AppError('CONFLICT', 'Ownership transfer conflicts with an existing wallet name or membership');
      }
      throw error;
    }
  }
}
