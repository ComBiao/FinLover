import type { SchedulerCategoryAccess, SchedulerRepositoryPort, SchedulerTransactionPoster } from '@/server/shared/ports/schedulers';
import type { WalletAccess } from '@/server/shared/ports/transactions';
import type { UnitOfWork } from '@/server/shared/ports/unit-of-work';
import { SchedulersController } from './controllers/SchedulersController';
import { CreateSchedulerService } from './services/CreateSchedulerService';
import { DeleteSchedulerService } from './services/DeleteSchedulerService';
import { GetSchedulerService, ListSchedulersService } from './services/ReadSchedulerServices';
import { RunDueSchedulersService } from './services/RunDueSchedulersService';
import { SetSchedulerStatusService } from './services/SetSchedulerStatusService';
import { UpdateSchedulerService } from './services/UpdateSchedulerService';

export function createSchedulerRouter(
  repo: SchedulerRepositoryPort, wallets: WalletAccess, categories: SchedulerCategoryAccess,
  poster: SchedulerTransactionPoster, uow: UnitOfWork,
) {
  const controller = new SchedulersController({
    list: new ListSchedulersService(repo),
    get: new GetSchedulerService(repo),
    create: new CreateSchedulerService(repo, wallets, categories, poster, uow),
    update: new UpdateSchedulerService(repo, wallets, categories, uow),
    setStatus: new SetSchedulerStatusService(repo, uow),
    remove: new DeleteSchedulerService(repo, uow),
  });
  return {
    list: controller.list.bind(controller),
    get: controller.get.bind(controller),
    create: controller.create.bind(controller),
    update: controller.update.bind(controller),
    setStatus: controller.setStatus.bind(controller),
    remove: controller.remove.bind(controller),
    runDue: new RunDueSchedulersService(repo, wallets, poster, uow),
  };
}
