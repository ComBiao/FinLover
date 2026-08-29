import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import { z } from 'zod';

import '@/models/Transaction'; 
import '@/models/Category';

const createTransactionSchema = z.object({
  category_id: z.string().min(1).optional().nullable(),
  type: z.enum(['Income', 'Expense'], {
    error: 'type is required and must be "Income" or "Expense"',
  }),
  amount: z.number({ error: 'amount is required and must be a number' }).positive('amount must be greater than 0'),
  date: z.string().min(1, 'date is required'),
  note: z.string().max(255).optional(),
});

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Bearer token' } },
        { status: 401 }
      );
    }

    const user_id = 'mocked_user_id_from_token';

    const body = await req.json();

    // ==========================================
    // 🛑 VALIDATION BLOCK — request-shape validation only.
    // Business-rule validation (category exists, category.type matches
    // transaction.type) lives in Transaction's pre('save') hook and is
    // caught below as a 422 as well.
    // ==========================================
    const parsed = createTransactionSchema.safeParse(body);

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

    await connectDB();
    const Transaction = mongoose.model('Transaction');

    const newTransaction = await Transaction.create({
      userId: user_id,
      categoryId: category_id || null,
      type,
      amount,
      date: new Date(date),
      note,
    });

    return NextResponse.json(
      {
        data: {
          id: newTransaction._id.toString(),
          category_id: newTransaction.categoryId ? newTransaction.categoryId.toString() : null,
          type: newTransaction.type,
          amount: newTransaction.amount,
          date: newTransaction.date.toISOString().split('T')[0],
          note: newTransaction.note,
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Add Transaction Error:', error);

    // Catch Mongoose-level validation/business-rule failures
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