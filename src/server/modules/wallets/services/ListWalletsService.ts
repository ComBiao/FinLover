import type { WalletReaderPort } from '@/server/shared/ports/wallets';
import type { WalletPresentationService } from './WalletPresentationService';

export class ListWalletsService {
  constructor(private repo: WalletReaderPort, private presentation: WalletPresentationService) {}
  async execute(userId: string) {
    return this.presentation.execute(await this.repo.listAccessible(userId), userId);
  }
}
