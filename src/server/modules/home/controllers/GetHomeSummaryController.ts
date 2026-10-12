import { NextResponse } from 'next/server';
import { homeSummaryQuery } from '@/shared/contracts';
import { connectDB } from '@/server/db/index';
import { apiErrorResponse, errorResponse, validationFields } from '@/server/shared/http/errors';
import type { RouteContext } from '@/server/shared/http/policy';
import type { GetHomeSummaryService } from '../services/GetHomeSummaryService';

export class GetHomeSummaryController {
  constructor(private service: GetHomeSummaryService) {}

  async handle(request: Request, context: RouteContext) {
    const params = new URL(request.url).searchParams;
    const parsed = homeSummaryQuery.safeParse({ month: params.get('month') ?? undefined, walletId: params.get('walletId') ?? undefined });
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION_ERROR', 'One or more fields are invalid', validationFields(parsed.error));
    }

    try {
      await connectDB();
      return NextResponse.json({ data: await this.service.execute(context.principal!.userId, parsed.data) });
    } catch (error) {
      return apiErrorResponse(error);
    }
  }
}
