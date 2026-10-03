import { apiErrorResponse, errorResponse, readJsonBody, validationFields } from '@/server/shared/http/errors';
import { TransactionResponseDTO } from '../dtos/TransactionResponseDTO';
import type { CreateTransactionService } from '../services/CreateTransactionService';
import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import { legacyTransactionInput } from '@/shared/contracts';
import type { RouteContext } from '@/server/shared/http/policy';

export class CreateTransactionController {
  constructor(private service: CreateTransactionService) {}
  async handle(req: Request, context: RouteContext) {
    try {
      const user_id = context.principal!.userId;

      const body = await readJsonBody(req);

      const parsed = legacyTransactionInput.safeParse(body);

      if (!parsed.success) {
        return errorResponse(422, 'VALIDATION_ERROR', 'One or more fields are invalid', validationFields(parsed.error));
      }

      const { wallet_id, category_id, type, amount, date, title, note } = parsed.data;

      await connectDB();
      const tx = await this.service.execute(user_id, { walletId: wallet_id, categoryId: category_id || null, type: type.toLowerCase() as 'income' | 'expense', amount, date: new Date(date), title, note });
      return NextResponse.json({ data: TransactionResponseDTO.legacy(tx) }, { status: 201 });

    } catch (error) {
      return apiErrorResponse(error, { validationStatus: 422 });
    }
  }
}
