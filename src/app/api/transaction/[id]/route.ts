import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

import '@/models/Transaction';
import '@/models/Category';

// Next.js passes dynamic route parameters as the second argument
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
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

    // 2. Parse Request Body
    const body = await req.json();
    const { category_id, type, amount, date, note } = body;

    // ==========================================
    // 🛑 VALIDATION BLOCK (Reserved for Ice)
    // Validate the params.id is a valid format.
    // Validate the body payload matches rules.
    // ==========================================

    // 3. Database Operations
    await connectDB();
    const Transaction = mongoose.model('Transaction');

    // Find the exact transaction belonging ONLY to this user
    const existingTransaction = await Transaction.findOne({
      _id: params.id,
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
    existingTransaction.categoryId = category_id;
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
  { params }: { params: { id: string } }
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

    // 2. Database Operations
    await connectDB();
    const Transaction = mongoose.model('Transaction');

    // Find and delete the transaction ONLY if it belongs to this user.
    // Using findOneAndDelete triggers any Mongoose pre/post middleware hooks you might have.
    const deletedTransaction = await Transaction.findOneAndDelete({
      _id: params.id,
      userId: user_id
    });

    // 3. Handle 404 (Not Found or Not Owned)
    // If it doesn't exist, or if another user tries to delete it, it returns 404.
    if (!deletedTransaction) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
        { status: 404 }
      );
    }

    // 4. Format 204 Response (No Content)
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