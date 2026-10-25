import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { connectDB } from '@/server/db/index';
import { apiErrorResponse, errorResponse, validationFields } from '@/server/shared/http/errors';
import type { RouteContext } from '@/server/shared/http/policy';

const QUERY_KEYS = ['walletIds', 'startDate', 'endDate', 'interval'] as const;

/** One controller for every /reports endpoint: they share the query shape and differ only in schema and service. */
export class GetReportController<Query> {
  constructor(private schema: z.ZodType<Query>, private service: { execute(userId: string, query: Query): Promise<unknown> }) {}

  async handle(request: Request, context: RouteContext) {
    const params = new URL(request.url).searchParams;
    // walletIds keeps an empty value so "no wallet selected" fails validation instead of meaning "all".
    const raw = Object.fromEntries(QUERY_KEYS.map(key => [key, key === 'walletIds' ? params.get(key) ?? undefined : params.get(key) || undefined]));
    const parsed = this.schema.safeParse(raw);
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
