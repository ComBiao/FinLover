import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import { AppError } from '@/server/shared/kernel/AppError';
import { apiErrorResponse, readJsonBody, validationFields } from '@/server/shared/http/errors';
import type { RouteContext } from '@/server/shared/http/policy';
import { schedulerInput, schedulerListQuery, schedulerStatusInput } from '@/shared/contracts/schedulers';
import type { SchedulerRecord } from '@/server/shared/ports/schedulers';
import { SchedulerResponseDTO } from '../dtos/SchedulerResponseDTO';
import type { CreateSchedulerService } from '../services/CreateSchedulerService';
import type { DeleteSchedulerService } from '../services/DeleteSchedulerService';
import type { GetSchedulerService, ListSchedulersService } from '../services/ReadSchedulerServices';
import type { SetSchedulerStatusService } from '../services/SetSchedulerStatusService';
import type { UpdateSchedulerService } from '../services/UpdateSchedulerService';
import type { SchedulerCommand } from '../services/rules';

const invalid = (error: Parameters<typeof validationFields>[0]) => new AppError('VALIDATION_ERROR', 'One or more fields are invalid', validationFields(error));
const toDate = (day: string) => new Date(`${day}T00:00:00.000Z`);

function parseCommand(body: unknown): SchedulerCommand {
  const parsed = schedulerInput.safeParse(body);
  if (!parsed.success) throw invalid(parsed.error);
  const { startDate, end, ...rest } = parsed.data;
  return { ...rest, startDate: toDate(startDate), end: end.type === 'endDate' ? { type: 'endDate', endDate: toDate(end.endDate) } : end };
}

export interface SchedulerServices {
  list: ListSchedulersService; get: GetSchedulerService; create: CreateSchedulerService;
  update: UpdateSchedulerService; setStatus: SetSchedulerStatusService; remove: DeleteSchedulerService;
}

export class SchedulersController {
  constructor(private services: SchedulerServices) {}

  private async respond(context: RouteContext, work: (userId: string) => Promise<Response>) {
    try {
      await connectDB();
      return await work(context.principal!.userId);
    } catch (error) { return apiErrorResponse(error); }
  }
  private json(record: SchedulerRecord, userId: string, status = 200) {
    return NextResponse.json({ data: SchedulerResponseDTO.from(record, userId) }, { status });
  }

  list(request: Request, context: RouteContext) {
    return this.respond(context, async userId => {
      const query = schedulerListQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
      if (!query.success) throw invalid(query.error);
      const records = await this.services.list.execute(userId, query.data);
      return NextResponse.json({ data: records.map(record => SchedulerResponseDTO.from(record, userId)) });
    });
  }
  get(_request: Request, context: RouteContext) {
    return this.respond(context, async userId => this.json(await this.services.get.execute((await context.params).id, userId), userId));
  }
  create(request: Request, context: RouteContext) {
    return this.respond(context, async userId => this.json(await this.services.create.execute(userId, parseCommand(await readJsonBody(request))), userId, 201));
  }
  update(request: Request, context: RouteContext) {
    return this.respond(context, async userId => this.json(await this.services.update.execute((await context.params).id, userId, parseCommand(await readJsonBody(request))), userId));
  }
  setStatus(request: Request, context: RouteContext) {
    return this.respond(context, async userId => {
      const parsed = schedulerStatusInput.safeParse(await readJsonBody(request));
      if (!parsed.success) throw invalid(parsed.error);
      return this.json(await this.services.setStatus.execute((await context.params).id, userId, parsed.data.action), userId);
    });
  }
  remove(_request: Request, context: RouteContext) {
    return this.respond(context, async userId => {
      await this.services.remove.execute((await context.params).id, userId);
      return new NextResponse(null, { status: 204 });
    });
  }
}
