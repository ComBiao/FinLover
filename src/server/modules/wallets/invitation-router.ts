import { WalletInvitationController } from './controllers/WalletInvitationController';
import type { WalletInvitationService } from './services/WalletInvitationService';
import type { RouteContext } from '@/server/shared/http/policy';

export function createWalletInvitationRouter(service: WalletInvitationService) {
  const controller = new WalletInvitationController(service);
  return {
    invite: controller.invite.bind(controller),
    list: controller.list.bind(controller),
    accept: (request: Request, context: RouteContext) => controller.respond(request, context, 'accept'),
    decline: (request: Request, context: RouteContext) => controller.respond(request, context, 'decline'),
  };
}
