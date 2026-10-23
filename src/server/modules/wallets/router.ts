import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import type { UserDirectoryPort } from '@/server/shared/ports/users';
import type { WalletPresentationService } from './services/WalletPresentationService';
import type { WalletRepositoryPort, WalletReaderPort } from '@/server/shared/ports/wallets';
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

export function createWalletRouter(repository: WalletRepositoryPort & WalletReaderPort, deleteWalletService: DeleteWalletService, presentation: WalletPresentationService, users: UserDirectoryPort, uow: UnitOfWork) {
  const create = new CreateWalletController(new CreateWalletService(repository, presentation, users, uow));
  const get = new GetWalletController(new GetWalletService(repository, presentation));
  const list = new ListWalletsController(new ListWalletsService(repository, presentation));
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
