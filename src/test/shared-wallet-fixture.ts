import { Types } from 'mongoose';
import Wallet from '@/server/db/models/Wallet';
import WalletMember from '@/server/db/models/WalletMember';

/** Test-only membership setup; does not exercise invitation APIs or write transactions. */
export async function seedSharedWallet(ownerId: string | Types.ObjectId, members: { userId: string | Types.ObjectId; status?: 'pending' | 'accepted' }[] = []) {
  const wallet = await Wallet.create({ userId: ownerId, name: `Shared ${new Types.ObjectId()}`, isShared: true, balance: 0 });
  const memberships = [];
  for (const member of members) {
    memberships.push(await WalletMember.create({ walletId: wallet._id, userId: member.userId, status: member.status ?? 'accepted', invitedBy: ownerId }));
  }
  return { wallet, memberships };
}
