import { apiErrorResponse, errorResponse } from '@/server/shared/http/errors';
import type { DeleteTransactionService } from '../services/DeleteTransactionService';
import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import mongoose from 'mongoose';

import type { RouteContext } from '@/server/shared/http/policy';

export class DeleteTransactionController {
  constructor(private service: DeleteTransactionService) {}
  async handle(req: Request, { params, principal }: RouteContext) {
    try {
      // 1. Authentication
      const user_id = principal!.userId;

      // 2. Resolve dynamic params
      const { id } = await params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(422, 'VALIDATION_ERROR', 'Invalid transaction id format', { id: 'must be a valid ObjectId' });
      }

      // 3. Database Operations
      await connectDB();
      await this.service.execute(id, user_id);
      return new NextResponse(null, { status: 204 });

    } catch (error) {
      return apiErrorResponse(error, { validationStatus: 422 });
    }
  }
}
