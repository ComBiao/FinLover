import type { WalletRepositoryPort } from '@/server/shared/ports/wallets';
import { mutable } from './mutable';

export class GetWalletService {
  constructor(private repo: WalletRepositoryPort) {}

  execute(id: string, userId: string) {
    return mutable(this.repo, id, userId);
  }
}
