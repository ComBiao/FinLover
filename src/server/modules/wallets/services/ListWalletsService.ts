import type { WalletRepositoryPort } from '@/server/shared/ports/wallets';

export class ListWalletsService {
  constructor(private repo: WalletRepositoryPort) {}

  execute(userId: string) {
    return this.repo.list(userId);
  }
}
