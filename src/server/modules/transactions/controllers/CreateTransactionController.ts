import { TransactionResponseDTO } from '../dtos/TransactionResponseDTO';
import type { CreateTransactionService } from '../services/CreateTransactionService';
import { AppError } from '@/server/shared/kernel/AppError';
import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import mongoose from 'mongoose';
import { legacyTransactionInput } from '@/shared/contracts';
import type { RouteContext } from '@/server/shared/http/policy';

 





export class CreateTransactionController {
  constructor(private service: CreateTransactionService) {}
  async handle(req: Request, context: RouteContext) {
  try {
    const user_id = context.principal!.userId;

    const body = await req.json();

    // ==========================================
    // 🛑 VALIDATION BLOCK — request-shape validation only.
    // Business-rule validation (category exists, category.type matches
    // transaction.type) lives in transaction services and is
    // caught below as a 422 as well.
    // ==========================================
    const parsed = legacyTransactionInput.safeParse(body);

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

    const { wallet_id, category_id, type, amount, date, note } = parsed.data;

    await connectDB();
    const tx = await this.service.execute(user_id, { walletId: wallet_id, categoryId: category_id || null, type: type.toLowerCase() as 'income' | 'expense', amount, date: new Date(date), note });
    return NextResponse.json({ data: TransactionResponseDTO.legacy(tx) }, { status: 201 });

  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } }, { status: error.code === 'NOT_FOUND' ? 404 : 422 });
    console.error('Add Transaction Error:');

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
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create transaction', fields: {} } },
      { status: 500 }
    );
  }
}
}
