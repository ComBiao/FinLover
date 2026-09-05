import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { verifyToken } from '@/lib/auth';

import '@/models/Transaction'; 
import '@/models/Category';
import '@/models/Wallet';

const createTransactionSchema = z.object({
  wallet_id: z.string().min(1, 'wallet_id is required'),
  category_id: z.string().min(1).optional().nullable(),
  type: z.enum(['Income', 'Expense'], {
  error: 'type is required and must be "Income" or "Expense"',}),
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

    const token = authHeader.slice(7); // strip "Bearer "
    let user_id: string;
    try {
      const payload = verifyToken<{ userId: string }>(token);
      user_id = payload.userId;
    } catch (err) {
      if (err instanceof jwt.JsonWebTokenError) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
          { status: 401 }
        );
      }
      throw err;
    }

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

    const { wallet_id, category_id, type, amount, date, note } = parsed.data;

    await connectDB();
    const Transaction = mongoose.model('Transaction');
    const Wallet = mongoose.model('Wallet');

    // Verify the wallet exists and belongs to the authenticated user before any write
    if (!mongoose.Types.ObjectId.isValid(wallet_id)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'One or more fields are invalid', fields: { wallet_id: 'must be a valid ObjectId' } } },
        { status: 422 }
      );
    }

    const wallet = await Wallet.findOne({ _id: wallet_id, userId: user_id }).lean();
    if (!wallet) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Wallet not found' } },
        { status: 404 }
      );
    }

    const newTransaction = await Transaction.create({
      userId: user_id,
      walletId: wallet_id,
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
          wallet_id: newTransaction.walletId.toString(),
          category_id: newTransaction.categoryId ? newTransaction.categoryId.toString() : null,
          type: newTransaction.type,
          amount: parseFloat(newTransaction.amount.toString()),
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