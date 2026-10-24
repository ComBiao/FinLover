import { AppError } from '@/server/shared/kernel/AppError';
import type { UnitOfWork, TransactionContext } from '@/server/shared/ports/unit-of-work';
import type { WalletMembershipPort } from '@/server/shared/ports/wallet-membership';
import type { WalletMembersPort } from '@/server/shared/ports/wallet-members';
import type { WalletReaderPort } from '@/server/shared/ports/wallets';
import type { UserDirectoryPort } from '@/server/shared/ports/users';
import type { WalletPresentationService } from './WalletPresentationService';

function validId(id: string) {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw new AppError('VALIDATION_ERROR', 'Invalid ID', { id: 'must be a valid ObjectId' });
  return id.toLowerCase();
}

export class WalletMembersService {
  constructor(
    private members: WalletMembersPort,
    private memberships: WalletMembershipPort,
    private wallets: WalletReaderPort,
    private users: UserDirectoryPort,
    private presentation: WalletPresentationService,
    private uow: UnitOfWork,
  ) {}

  private async check(walletId: string, userId: string, context: TransactionContext, mutate: boolean) {
    // GET uses a read-only snapshot; it must not increment the wallet lock.
    const wallet = mutate ? await this.memberships.lockWallet(walletId, context) : (await this.wallets.findByIds([walletId], context))[0];
    if (!wallet) throw new AppError('NOT_FOUND', 'Wallet not found');
    const role = await this.memberships.roleOf(walletId, userId, context);
    if (!role) throw new AppError(wallet.isShared ? 'FORBIDDEN' : 'NOT_FOUND', wallet.isShared ? 'Only wallet members can access this wallet' : 'Wallet not found');
    if (!wallet.isShared) throw new AppError('VALIDATION_ERROR', 'Member operations require a shared wallet');
    return { wallet, role };
  }

  async list(id: string, userId: string) {
    const walletId = validId(id);
    return this.uow.run(async context => {
      const { wallet } = await this.check(walletId, userId, context, false);
      const rows = [{ userId: wallet.userId, status: 'accepted' as const }, ...await this.members.list(walletId, context)];
      const users = new Map((await this.users.findPublicByIds(rows.map(row => row.userId), context)).map(user => [user.id, user]));
      return { members: rows.map(row => {
        const user = users.get(row.userId);
        if (!user) throw new AppError('CONFLICT', 'Member account no longer exists');
        return { userId: user.id, name: user.name, email: user.email, role: row.userId === wallet.userId ? 'owner' as const : 'contributor' as const, status: row.status };
      }) };
    });
  }

  async remove(id: string, userId: string, targetId: string) {
    const walletId = validId(id), target = validId(targetId);
    return this.uow.run(async context => {
      const { wallet, role } = await this.check(walletId, userId, context, true);
      if (role !== 'owner') throw new AppError('FORBIDDEN', 'Only the wallet owner can remove members');
      if (target === wallet.userId) throw new AppError('CONFLICT', 'Cannot remove the wallet owner; transfer ownership first');
      if (!await this.members.remove(walletId, target, context)) throw new AppError('NOT_FOUND', 'Member or invitation not found');
    });
  }

  async leave(id: string, userId: string) {
    const walletId = validId(id);
    return this.uow.run(async context => {
      const { role } = await this.check(walletId, userId, context, true);
      if (role === 'owner') {
        const hasContributors = (await this.members.list(walletId, context)).some(member => member.status === 'accepted');
        throw new AppError('CONFLICT', hasContributors ? 'Transfer ownership before leaving the wallet' : 'Use Delete wallet to remove a wallet without Contributors');
      }
      if (!await this.members.remove(walletId, userId, context)) throw new AppError('FORBIDDEN', 'Only wallet members can leave this wallet');
    });
  }

  async transfer(id: string, userId: string, targetId: string) {
    const walletId = validId(id), target = validId(targetId);
    return this.uow.run(async context => {
      const { role } = await this.check(walletId, userId, context, true);
      if (role !== 'owner') throw new AppError('FORBIDDEN', 'Only the wallet owner can transfer ownership');
      if (target === userId || await this.memberships.roleOf(walletId, target, context) !== 'contributor') {
        throw new AppError('CONFLICT', 'New owner must be an accepted Contributor');
      }
      // Serialize both sides with account deletion, including an account which
      // did not own this wallet when its deletion snapshot began.
      for (const accountId of [userId, target].sort()) {
        if (!await this.users.lockById(accountId, context)) throw new AppError('CONFLICT', 'Member account no longer exists');
      }
      await this.members.transfer(walletId, userId, target, context);
      return (await this.presentation.execute(await this.wallets.findByIds([walletId], context), userId, context))[0];
    });
  }
}
