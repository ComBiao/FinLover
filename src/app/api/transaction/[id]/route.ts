import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import { z } from 'zod';

import '@/models/Transaction';
import '@/models/Category';

const updateTransactionSchema = z.object({
  category_id: z.string().min(1).optional().nullable(),
  type: z.enum(['Income', 'Expense'], {
    error: 'type is required and must be "Income" or "Expense"',
  }),
  amount: z.number({ error: 'amount is required and must be a number' }).positive('amount must be greater than 0'),
  date: z.string().min(1, 'date is required'),
  note: z.string().max(255).optional(),
});

// Next.js passes dynamic route parameters as the second argument
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Bearer token' } },
        { status: 401 }
      );
    }

    const user_id = 'mocked_user_id_from_token';

    // 2. Resolve dynamic params + parse body
    const { id } = await params;
    const body = await req.json();

    // ==========================================
    // 🛑 VALIDATION BLOCK
    // Validate id is a valid ObjectId format.
    // Validate the body payload matches rules.
    // Business-rule validation (category exists, category.type matches
    // transaction.type) lives in Transaction's pre('save') hook and is
    // caught below as a 422 as well.
    // ==========================================
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid transaction id format', fields: { id: 'must be a valid ObjectId' } } },
        { status: 422 }
      );
    }

    const parsed = updateTransactionSchema.safeParse(body);

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
    const Transaction = mongoose.model('Transaction');

    // Find the exact transaction belonging ONLY to this user
    const existingTransaction = await Transaction.findOne({
      _id: id,
      userId: user_id
    });

    // Handle 404 Not Found (or 403 Forbidden implicitly by not finding it under this user)
    if (!existingTransaction) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
        { status: 404 }
      );
    }

    // Update fields (Full Replace as defined in the spec)
    existingTransaction.categoryId = category_id || null;
    existingTransaction.type = type;
    existingTransaction.amount = amount;
    existingTransaction.date = new Date(date);
    existingTransaction.notes = note;

    await existingTransaction.save();

    // 4. Format Response
    return NextResponse.json(
      {
        data: {
          id: existingTransaction._id.toString(),
          category_id: existingTransaction.categoryId?.toString() || null,
          type: existingTransaction.type,
          amount: parseFloat(existingTransaction.amount.toString()),
          date: existingTransaction.date.toISOString().split('T')[0],
          note: existingTransaction.notes
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Update Transaction Error:', error);

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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Bearer token' } },
        { status: 401 }
      );
    }

    const user_id = 'mocked_user_id_from_token';

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
    const Transaction = mongoose.model('Transaction');

    // Find and delete the transaction ONLY if it belongs to this user.
    // Using findOneAndDelete triggers any Mongoose pre/post middleware hooks you might have.
    const deletedTransaction = await Transaction.findOneAndDelete({
      _id: id,
      userId: user_id
    });

    // 4. Handle 404 (Not Found or Not Owned)
    // If it doesn't exist, or if another user tries to delete it, it returns 404.
    if (!deletedTransaction) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
        { status: 404 }
      );
    }

    // 5. Format 204 Response (No Content)
    // A 204 response technically shouldn't have a JSON body, so we return null.
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Delete Transaction Error:', error);
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