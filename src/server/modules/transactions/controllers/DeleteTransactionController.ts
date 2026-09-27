import type { DeleteTransactionService } from '../services/DeleteTransactionService';
import { AppError } from '@/server/shared/kernel/AppError';
import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import mongoose from 'mongoose';

import type { RouteContext } from '@/server/shared/http/policy';




export class DeleteTransactionController {
  constructor(private service: DeleteTransactionService) {}
  async handle(
  req: Request,
  { params, principal }: RouteContext
) {
  try {
    // 1. Authentication
    const user_id = principal!.userId;

    // 2. Resolve dynamic params
    const { id } = await params;

    // ==========================================
    // 🛑 VALIDATION BLOCK
    // Validate id is a valid ObjectId format.
    // ==========================================
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid transaction id format', fields: { id: 'must be a valid ObjectId' } } },
        { status: 422 }
      );
    }

    // 3. Database Operations
    await connectDB();
    await this.service.execute(id, user_id);
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } }, { status: error.code === 'NOT_FOUND' ? 404 : 422 });
    console.error('Delete Transaction Error:');
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to delete transaction' 
        } 
      },
      { status: 500 }
    );
  }
}
}
