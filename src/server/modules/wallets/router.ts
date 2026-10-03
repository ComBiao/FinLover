import type { WalletRepositoryPort } from '@/server/shared/ports/wallets';
import { CreateWalletController } from './controllers/CreateWalletController';
import { ListWalletsController } from './controllers/ListWalletsController';
import { CreateWalletService } from './services/CreateWalletService';
import { ListWalletsService } from './services/ListWalletsService';

export function createWalletRouter(repository: WalletRepositoryPort) {
  const create = new CreateWalletController(new CreateWalletService(repository));
  const list = new ListWalletsController(new ListWalletsService(repository));
  return { create: create.handle.bind(create), list: list.handle.bind(list) };
}
