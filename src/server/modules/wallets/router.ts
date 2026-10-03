import type { DeleteWalletService } from './services/DeleteWalletService';
import { DeleteWalletController } from './controllers/DeleteWalletController';
export function createWalletRouter(deleteWalletService: DeleteWalletService) {
  const remove = new DeleteWalletController(deleteWalletService);
  return { remove: remove.handle.bind(remove) };
}
