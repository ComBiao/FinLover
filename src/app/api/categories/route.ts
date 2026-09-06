import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import Category from '@/models/Category';
import { verifySessionToken } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const verification = verifySessionToken<{ userId: string }>(token);
    
    if (!verification.valid) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } },
        { status: 401 }
      );
    }

    const userId = new mongoose.Types.ObjectId(verification.payload.userId);

    const body = await req.json().catch(() => ({}));
    const { name, type, color } = body;

    const fields: Record<string, string> = {};
    if (!name) fields.name = 'Name is required';
    else if (typeof name !== 'string' || name.length > 50) fields.name = 'Name must be a string up to 50 characters';

    if (!type) fields.type = 'Type is required';
    else if (type !== 'income' && type !== 'expense') fields.type = 'Type must be income or expense';

    if (Object.keys(fields).length > 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields } },
        { status: 400 }
      );
    }

    const category = await Category.create({
      userId,
      name,
      type,
      color,
      isSystem: false,
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    const err = error as { code?: number };
    if (err.code === 11000) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'A category with this name already exists' } },
        { status: 409 }
      );
    }
    if (error instanceof mongoose.Error.ValidationError) {
      const fields: Record<string, string> = {};
      for (const key in error.errors) {
        fields[key] = error.errors[key].message;
      }
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields } },
        { status: 400 }
      );
    }
    console.error('POST /api/categories error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

