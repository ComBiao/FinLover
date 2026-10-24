import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import type { UserDirectoryPort } from '@/server/shared/ports/users';
import { AppError } from '@/server/shared/kernel/AppError';
import type { WalletPresentationService } from './WalletPresentationService';
import type { WalletCreateInput, WalletRepositoryPort } from '@/server/shared/ports/wallets';

/** Creates a wallet for the authenticated user; ownership is intentionally not client input. */
export class CreateWalletService {
  constructor(private repo: WalletRepositoryPort, private presentation: WalletPresentationService, private users: UserDirectoryPort, private uow: UnitOfWork) {}

  async execute(userId: string, input: WalletCreateInput) {
    const wallet = input.isShared ? await this.uow.run(async context => {
      if (!await this.users.lockById(userId, context)) throw new AppError('NOT_FOUND', 'Account not found');
      return this.repo.create(userId, input, context);
    }) : await this.repo.create(userId, input);
    return (await this.presentation.execute([wallet], userId))[0];
  }
}
