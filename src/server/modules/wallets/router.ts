import type { WalletRepositoryPort } from '@/server/shared/ports/wallets';
import { CreateWalletController } from './controllers/CreateWalletController';
import { GetWalletController } from './controllers/GetWalletController';
import { ListWalletsController } from './controllers/ListWalletsController';
import { UpdateWalletController } from './controllers/UpdateWalletController';
import { CreateWalletService } from './services/CreateWalletService';
import { GetWalletService } from './services/GetWalletService';
import { ListWalletsService } from './services/ListWalletsService';
import { UpdateWalletService } from './services/UpdateWalletService';

export function createWalletRouter(repository: WalletRepositoryPort) {
  const create = new CreateWalletController(new CreateWalletService(repository));
  const get = new GetWalletController(new GetWalletService(repository));
  const list = new ListWalletsController(new ListWalletsService(repository));
  const update = new UpdateWalletController(new UpdateWalletService(repository));
  return {
    create: create.handle.bind(create),
    get: get.handle.bind(get),
    list: list.handle.bind(list),
    update: update.handle.bind(update),
  };
}
