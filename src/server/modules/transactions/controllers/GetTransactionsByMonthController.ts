import { NextResponse } from 'next/server';
import { transactionMonthQuery } from '@/shared/contracts';
import { connectDB } from '@/server/db/index';
import { errorResponse, validationFields } from '@/server/shared/http/errors';
import type { RouteContext } from '@/server/shared/http/policy';
import type { GetTransactionsByMonthService } from '../services/GetTransactionsByMonthService';
import { TransactionResponseDTO } from '../dtos/TransactionResponseDTO';

export class GetTransactionsByMonthController {
  constructor(private service: GetTransactionsByMonthService) {}

  async handle(request: Request, context: RouteContext) {
    const params = new URL(request.url).searchParams;
    const parsed = transactionMonthQuery.safeParse({ month: params.get('month') ?? undefined, search: params.get('search') ?? undefined });
    if (!parsed.success) {
      return errorResponse(400, 'VALIDATION_ERROR', 'One or more fields are invalid', validationFields(parsed.error));
    }

    await connectDB();
    const transactions = await this.service.execute(context.principal!.userId, parsed.data.month, parsed.data.search);
    return NextResponse.json({ data: transactions.map(TransactionResponseDTO.v1) });
  }
}
