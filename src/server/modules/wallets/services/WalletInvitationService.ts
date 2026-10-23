import { AppError } from '@/server/shared/kernel/AppError';
import type { UnitOfWork, TransactionContext } from '@/server/shared/ports/unit-of-work';
import type { WalletInvitationRecord, WalletInvitationRepositoryPort, WalletMembershipPort } from '@/server/shared/ports/wallet-membership';
import type { WalletReaderPort } from '@/server/shared/ports/wallets';
import type { UserDirectoryPort, UserRepositoryPort } from '@/server/shared/ports/users';

function validId(id: string) {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw new AppError('VALIDATION_ERROR', 'Invalid ID', { id: 'must be a valid ObjectId' });
}

/** Invitation use cases share atomic access checks; no transport or model access. */
export class WalletInvitationService {
  constructor(
    private invitations: WalletInvitationRepositoryPort,
    private memberships: WalletMembershipPort,
    private wallets: WalletReaderPort,
    private users: UserDirectoryPort & Pick<UserRepositoryPort, 'findByEmail'>,
    private uow: UnitOfWork,
  ) {}

  private async present(rows: WalletInvitationRecord[], context?: TransactionContext) {
    const wallets = new Map((await this.wallets.findByIds(rows.map(row => row.walletId), context)).map(wallet => [wallet.id, wallet]));
    const users = new Map((await this.users.findPublicByIds(rows.map(row => row.invitedBy), context)).map(user => [user.id, user]));
    // Deletion may win a race with this read. Never expose orphaned invitations.
    return rows.filter(row => wallets.get(row.walletId)?.isShared).map(row => ({
      id: row.id, walletId: row.walletId, walletName: wallets.get(row.walletId)!.name,
      invitedByName: users.get(row.invitedBy)?.name ?? 'Deleted user', createdAt: row.createdAt.toISOString(),
    }));
  }

  async invite(walletId: string, ownerId: string, email: string) {
    validId(walletId);
    return this.uow.run(async context => {
      const wallet = await this.memberships.lockWallet(walletId, context);
      if (wallet.userId !== ownerId) throw new AppError(wallet.isShared ? 'FORBIDDEN' : 'NOT_FOUND', wallet.isShared ? 'Only the wallet owner can invite members' : 'Wallet not found');
      if (!wallet.isShared) throw new AppError('VALIDATION_ERROR', 'Invitations require a shared wallet');
      const target = await this.users.findByEmail(email);
      const targetId = target?._id.toString();
      if (!targetId) throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { email: 'User not found' });
      if (targetId === ownerId) throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { email: 'Cannot invite yourself' });
      if (!await this.users.lockById(targetId, context)) throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', { email: 'User not found' });
      const invitation = await this.invitations.create(walletId, targetId, ownerId, context);
      return (await this.present([invitation], context))[0];
    });
  }

  async list(userId: string) {
    const items = await this.present(await this.invitations.listPending(userId));
    return { items, total: items.length };
  }

  async respond(id: string, userId: string, action: 'accept' | 'decline') {
    validId(id);
    return this.uow.run(async context => {
      const invitation = await this.invitations.find(id, context);
      if (!invitation) throw new AppError('NOT_FOUND', 'Invitation not found');
      if (invitation.userId !== userId) throw new AppError('FORBIDDEN', 'Only the invitee can respond to this invitation');
      const wallet = await this.memberships.lockWallet(invitation.walletId, context);
      if (!wallet.isShared) throw new AppError('CONFLICT', 'Invitation no longer belongs to a shared wallet');
      if (invitation.status !== 'pending') throw new AppError('CONFLICT', 'Invitation has already been accepted');
      const user = await this.users.lockById(userId, context);
      if (!user) throw new AppError('NOT_FOUND', 'Account not found');
      if (!await this.invitations[action](id, userId, context)) throw new AppError('CONFLICT', 'Invitation is no longer pending');
      return action === 'decline' ? null : { userId, name: user.name, email: user.email, role: 'contributor' as const, status: 'accepted' as const };
    });
  }
}
