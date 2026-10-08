import type { WalletRepositoryPort, WalletTransactionCleanup } from '@/server/shared/ports/wallets';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { AppError } from '@/server/shared/kernel/AppError';
import { mutable } from './mutable';
export class DeleteWalletService {
  constructor(private repo: WalletRepositoryPort, private cleanup: WalletTransactionCleanup, private uow: UnitOfWork) {}
  execute(id: string, userId: string) {
    return this.uow.run(async context => {
      await mutable(this.repo, id, userId, context);
      await this.cleanup.removeByWallet(id, userId, context);
      const deleted = await this.repo.delete(id, userId, context);
      if (!deleted) throw new AppError('NOT_FOUND', 'Wallet not found');
    });
  }
}
