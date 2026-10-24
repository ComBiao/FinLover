import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import type { WalletRecord } from '@/server/shared/ports/wallets';
import type { WalletMembershipPort } from '@/server/shared/ports/wallet-membership';
import type { UserDirectoryPort } from '@/server/shared/ports/users';

export class WalletPresentationService {
  constructor(private memberships: WalletMembershipPort, private users: UserDirectoryPort) {}
  async execute(wallets: WalletRecord[], userId: string, context?: TransactionContext) {
    const members = await this.memberships.acceptedMembers(wallets.filter(wallet => wallet.isShared).map(wallet => wallet.id), context);
    const ids = [...new Set([...wallets.map(wallet => wallet.userId), ...members.map(member => member.userId)])];
    const users = new Map((await this.users.findPublicByIds(ids, context)).map(user => [user.id, user.name]));
    return wallets.map(wallet => {
      const memberIds = [wallet.userId, ...members.filter(member => member.walletId === wallet.id && member.userId !== wallet.userId).map(member => member.userId)];
      return { ...wallet, isShared: wallet.isShared === true, role: wallet.userId === userId ? 'owner' as const : 'contributor' as const,
        memberCount: memberIds.length, membersPreview: memberIds.slice(0, 3).map(id => ({ id, name: users.get(id) ?? 'Deleted user' })), ownerName: users.get(wallet.userId) ?? 'Deleted user' };
    });
  }
}
