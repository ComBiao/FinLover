import type { WalletReaderPort } from '@/server/shared/ports/wallets';
import type { WalletPresentationService } from './WalletPresentationService';

export class GetWalletService {
  constructor(private repo: WalletReaderPort, private presentation: WalletPresentationService) {}
  async execute(id: string, userId: string) {
    const wallet = await this.repo.findAccessible(id, userId);
    return (await this.presentation.execute([wallet], userId))[0];
  }
}
