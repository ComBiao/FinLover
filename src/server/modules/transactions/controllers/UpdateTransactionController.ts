import { apiErrorResponse, errorResponse, readJsonBody, validationFields } from '@/server/shared/http/errors';
import { TransactionResponseDTO } from '../dtos/TransactionResponseDTO';
import type { UpdateTransactionService } from '../services/UpdateTransactionService';
import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import mongoose from 'mongoose';
import { legacyTransactionUpdate } from '@/shared/contracts';
import type { RouteContext } from '@/server/shared/http/policy';

// Next.js passes dynamic route parameters as the second argument
export class UpdateTransactionController {
  constructor(private service: UpdateTransactionService) {}
  async handle(req: Request, { params, principal }: RouteContext) {
    try {
      // 1. Authentication
      const user_id = principal!.userId;

      // 2. Resolve dynamic params + parse body
      const { id } = await params;
      const body = await readJsonBody(req);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(422, 'VALIDATION_ERROR', 'Invalid transaction id format', { id: 'must be a valid ObjectId' });
      }

      const parsed = legacyTransactionUpdate.safeParse(body);

      if (!parsed.success) {
        return errorResponse(422, 'VALIDATION_ERROR', 'One or more fields are invalid', validationFields(parsed.error));
      }

      const { category_id, type, amount, date, title, note } = parsed.data;

      // 3. Database Operations
      await connectDB();
      const tx = await this.service.execute(id, user_id, { categoryId: category_id || null, type: type.toLowerCase() as 'income' | 'expense', amount, date: new Date(date), title, note });
      return NextResponse.json({ data: TransactionResponseDTO.legacy(tx) });

    } catch (error) {
      return apiErrorResponse(error, { validationStatus: 422 });
    }
  }
}
