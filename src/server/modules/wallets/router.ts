import type { WalletRepositoryPort } from '@/server/shared/ports/wallets';
import { CreateWalletController } from './controllers/CreateWalletController';
import { DeleteWalletController } from './controllers/DeleteWalletController';
import { GetWalletController } from './controllers/GetWalletController';
import { ListWalletsController } from './controllers/ListWalletsController';
import { UpdateWalletController } from './controllers/UpdateWalletController';
import { CreateWalletService } from './services/CreateWalletService';
import type { DeleteWalletService } from './services/DeleteWalletService';
import { GetWalletService } from './services/GetWalletService';
import { ListWalletsService } from './services/ListWalletsService';
import { UpdateWalletService } from './services/UpdateWalletService';
import { UpdateWalletSavingController } from './controllers/UpdateWalletSavingController';
import { UpdateWalletSavingService } from './services/UpdateWalletSavingService';

export function createWalletRouter(repository: WalletRepositoryPort, deleteWalletService: DeleteWalletService) {
  const create = new CreateWalletController(new CreateWalletService(repository));
  const get = new GetWalletController(new GetWalletService(repository));
  const list = new ListWalletsController(new ListWalletsService(repository));
  const update = new UpdateWalletController(new UpdateWalletService(repository));
  const updateSaving = new UpdateWalletSavingController(new UpdateWalletSavingService(repository));
  const remove = new DeleteWalletController(deleteWalletService);
  return {
    create: create.handle.bind(create),
    get: get.handle.bind(get),
    list: list.handle.bind(list),
    update: update.handle.bind(update),
    updateSaving: updateSaving.handle.bind(updateSaving),
    remove: remove.handle.bind(remove),
  };
}
