import { TransactionResponseDTO } from '../dtos/TransactionResponseDTO';
import type { UpdateTransactionService } from '../services/UpdateTransactionService';
import { AppError } from '@/server/shared/kernel/AppError';
import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import mongoose from 'mongoose';
import { legacyTransactionUpdate } from '@/shared/contracts';
import type { RouteContext } from '@/server/shared/http/policy';






// Next.js passes dynamic route parameters as the second argument
export class UpdateTransactionController {
  constructor(private service: UpdateTransactionService) {}
  async handle(
  req: Request,
  { params, principal }: RouteContext
) {
  try {
    // 1. Authentication
    const user_id = principal!.userId;

    // 2. Resolve dynamic params + parse body
    const { id } = await params;
    const body = await req.json();

    // ==========================================
    // 🛑 VALIDATION BLOCK
    // Validate id is a valid ObjectId format.
    // Validate the body payload matches rules.
    // Business-rule validation (category exists, category.type matches
    // transaction.type) lives in transaction services and is
    // caught below as a 422 as well.
    // ==========================================
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid transaction id format', fields: { id: 'must be a valid ObjectId' } } },
        { status: 422 }
      );
    }

    const parsed = legacyTransactionUpdate.safeParse(body);

    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || 'root';
        fields[key] = issue.message;
      }

      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'One or more fields are invalid', fields } },
        { status: 422 }
      );
    }

    const { category_id, type, amount, date, note } = parsed.data;

    // 3. Database Operations
    await connectDB();
    const tx = await this.service.execute(id, user_id, { categoryId: category_id || null, type: type.toLowerCase() as 'income' | 'expense', amount, date: new Date(date), note });
    return NextResponse.json({ data: TransactionResponseDTO.legacy(tx) });

  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } }, { status: error.code === 'NOT_FOUND' ? 404 : 422 });
    console.error('Update Transaction Error:');

    // Catch persistence validation failures
    // (category doesn't exist, category.type mismatch, min amount, etc.)
    if (error instanceof mongoose.Error.ValidationError) {
      const fields: Record<string, string> = {};
      for (const [key, err] of Object.entries(error.errors)) {
        fields[key] = err.message;
      }
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'One or more fields are invalid', fields } },
        { status: 422 }
      );
    }

    if (error instanceof Error && (
      error.message.includes('does not exist') ||
      error.message.includes('does not match category type')
    )) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: error.message, fields: {} } },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to update transaction' 
        } 
      },
      { status: 500 }
    );
  }
}


}
