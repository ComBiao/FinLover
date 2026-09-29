import type { WalletRepositoryPort } from '@/server/shared/ports/wallets';
import { ListWalletsController } from './controllers/ListWalletsController';
import { GetWalletController } from './controllers/GetWalletController';
import { ListWalletsService } from './services/ListWalletsService';
import { GetWalletService } from './services/GetWalletService';

export function createWalletRouter(repo: WalletRepositoryPort) {
  const list = new ListWalletsController(new ListWalletsService(repo));
  const get = new GetWalletController(new GetWalletService(repo));
  return { list: list.handle.bind(list), get: get.handle.bind(get) };
}
