import type { WalletRepositoryPort } from '@/server/shared/ports/wallets';
import { UpdateWalletSavingService } from './services/UpdateWalletSavingService';
import { UpdateWalletSavingController } from './controllers/UpdateWalletSavingController';
export function createWalletRouter(repo: WalletRepositoryPort) {
  const updateSaving = new UpdateWalletSavingController(new UpdateWalletSavingService(repo));
  return { updateSaving: updateSaving.handle.bind(updateSaving) };
}
