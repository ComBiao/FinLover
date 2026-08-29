import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db'; // Ensure this path matches your db.ts location
import mongoose from 'mongoose';

// Ensure the models are registered
import '@/models/Transaction'; 
import '@/models/Category';

export async function POST(req: Request) {
  try {
    // 1. Authentication (Team Auth domain)
    // We strictly extract user_id from the header, ignoring any user_id in the body.
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Bearer token' } },
        { status: 401 }
      );
    }
    
    // TODO: Replace with actual token verification logic from the Auth team
    const user_id = 'mocked_user_id_from_token'; 

    // 2. Parse Request Body
    const body = await req.json();
    const { category_id, type, amount, date, note } = body;

    // ==========================================
    // 🛑 VALIDATION BLOCK (Reserved for Ice)
    // Ice will inject his Zod schema validation here.
    // If it fails, he will return a 422 VALIDATION_ERROR.
    // ==========================================

    // 3. Database Operations
    await connectDB();
    const Transaction = mongoose.model('Transaction');

    // Create the transaction in MongoDB
    const newTransaction = await Transaction.create({
      userId: user_id,
      categoryId: category_id || null,
      type: type,
      amount: amount, // Mongoose automatically casts the JS number to Decimal128
      date: new Date(date),
      notes: note // Mapping API 'note' to our DB schema 'notes' field
    });

    // 4. Format the standard 201 Response
    return NextResponse.json(
      {
        data: {
          id: newTransaction._id.toString(), // Mapping DB '_id' to API 'id'
          category_id: newTransaction.categoryId.toString(),
          type: newTransaction.type,
          // Convert Decimal128 back to a standard JavaScript number for the JSON response
          amount: parseFloat(newTransaction.amount.toString()),
          // Format Date object back to "YYYY-MM-DD"
          date: newTransaction.date.toISOString().split('T')[0],
          note: newTransaction.notes
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Add Transaction Error:', error);
    
    // Fallback error handler
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to create transaction',
          fields: {} 
        } 
      },
      { status: 500 }
    );
  }
}