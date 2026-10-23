import 'server-only';
import Wallet from '@/server/db/models/Wallet';
import WalletMember from '@/server/db/models/WalletMember';
import { sessionOf } from '@/server/db/unit-of-work';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import type { WalletMembershipPort } from '@/server/shared/ports/wallet-membership';
import { AppError } from '@/server/shared/kernel/AppError';

export class WalletMembershipRepository implements WalletMembershipPort {
  async roleOf(walletId: string, userId: string, context?: TransactionContext) {
    const wallet = await Wallet.findById(walletId).session(sessionOf(context) ?? null).lean();
    if (!wallet) return null;
    if (String(wallet.userId) === userId) return 'owner' as const;
    if (!wallet.isShared) return null;
    const member = await WalletMember.exists({ walletId, userId, status: 'accepted' }).session(sessionOf(context) ?? null);
    return member ? 'contributor' as const : null;
  }
  async listAccessible(userId: string, context?: TransactionContext) {
    const members = await WalletMember.find({ userId, status: 'accepted' }).select('walletId').session(sessionOf(context) ?? null).lean();
    const wallets = await Wallet.find({ $or: [{ userId }, { _id: { $in: members.map(member => member.walletId) }, isShared: true }] })
      .select('_id').session(sessionOf(context) ?? null).lean();
    return wallets.map(wallet => String(wallet._id));
  }
  async acceptedMembers(walletIds: string[], context?: TransactionContext) {
    const rows = await WalletMember.find({ walletId: { $in: walletIds }, status: 'accepted' })
      .sort({ createdAt: 1, _id: 1 }).session(sessionOf(context) ?? null).lean();
    return rows.map(row => ({ walletId: String(row.walletId), userId: String(row.userId) }));
  }
  async lockWallet(walletId: string, context: TransactionContext) {
    // A real write (not a no-op $set) forces transaction retry on concurrent
    // accept/invite/delete. Shared transaction services must use this same lock.
    const wallet = await Wallet.findOneAndUpdate({ _id: walletId }, { $inc: { membershipVersion: 1 } }, { session: sessionOf(context), returnDocument: 'after' });
    if (!wallet) throw new AppError('NOT_FOUND', 'Wallet not found');
    return { userId: String(wallet.userId), isShared: wallet.isShared === true };
  }
}
