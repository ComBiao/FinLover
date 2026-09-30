import type { WalletCreateInput, WalletRepositoryPort } from '@/server/shared/ports/wallets';

/** Creates a wallet for the authenticated user; ownership is intentionally not client input. */
export class CreateWalletService {
  constructor(private repo: WalletRepositoryPort) {}

  execute(userId: string, input: WalletCreateInput) {
    return this.repo.create(userId, input);
  }
}
