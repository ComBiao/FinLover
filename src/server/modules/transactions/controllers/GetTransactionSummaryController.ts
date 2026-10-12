import { NextResponse } from 'next/server';
import { transactionSummaryQuery } from '@/shared/contracts';
import { connectDB } from '@/server/db/index';
import { apiErrorResponse, errorResponse, validationFields } from '@/server/shared/http/errors';
import type { RouteContext } from '@/server/shared/http/policy';
import type { GetTransactionSummaryService } from '../services/GetTransactionSummaryService';

const QUERY_KEYS = ['from', 'to', 'walletId', 'categoryId', 'type', 'search'] as const;

export class GetTransactionSummaryController {
  constructor(private service: GetTransactionSummaryService) {}

  async handle(request: Request, context: RouteContext) {
    const params = new URL(request.url).searchParams;
    const parsed = transactionSummaryQuery.safeParse(Object.fromEntries(QUERY_KEYS.map(key => [key, params.get(key) || undefined])));
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
