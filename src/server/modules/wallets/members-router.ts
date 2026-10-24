import { WalletMembersController } from './controllers/WalletMembersController';
import type { WalletMembersService } from './services/WalletMembersService';
import type { RouteContext } from '@/server/shared/http/policy';

export function createWalletMembersRouter(service: WalletMembersService) {
  const controller = new WalletMembersController(service);
  return {
    list: (request: Request, context: RouteContext) => controller.handle(request, context, 'list'),
    remove: (request: Request, context: RouteContext) => controller.handle(request, context, 'remove'),
    leave: (request: Request, context: RouteContext) => controller.handle(request, context, 'leave'),
    transfer: (request: Request, context: RouteContext) => controller.handle(request, context, 'transfer'),
  };
}
