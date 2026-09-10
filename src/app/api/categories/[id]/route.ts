import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import Category from '@/models/Category';
import { deleteCategoryAndCascade } from '@/lib/services/categoryService';
import { authenticateRequest } from '@/lib/apiAuth';

async function checkAuthAndGetCategory(req: NextRequest, id: string) {
  const auth = authenticateRequest(req);
  if (auth.errorRes) return { errorRes: auth.errorRes };
  const { userId } = auth;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { errorRes: NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid category ID', fields: {} } }, { status: 400 }) };
  }

  const category = await Category.findOne({ _id: id, userId });
  if (!category) {
    return { errorRes: NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Category not found' } }, { status: 404 }) };
  }

  if (category.isSystem) {
    return { errorRes: NextResponse.json({ error: { code: 'FORBIDDEN', message: 'System categories cannot be modified or deleted' } }, { status: 403 }) };
  }

  return { userId, category };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const authCheck = await checkAuthAndGetCategory(req, id);
    if (authCheck.errorRes) return authCheck.errorRes;

    const { category } = authCheck;
    const body = await req.json().catch(() => ({}));
    const { name, type, color } = body;

    const fields: Record<string, string> = {};
    if (name !== undefined) {
      if (typeof name !== 'string'|| name.trim().length === 0 || name.length > 50) fields.name = 'Name must be a string up to 50 characters';
      else if (name.trim().length === 0) fields.name = 'Name is required';
      else category!.name = name;
    }
    if (type !== undefined) {
      if (type !== 'income' && type !== 'expense') fields.type = 'Type must be income or expense';
      else category!.type = type;
    }
    if (color !== undefined) {
      category!.color = color;
    }

    if (Object.keys(fields).length > 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields } },
        { status: 400 }
      );
    }

    await category!.save();

    return NextResponse.json({ data: category }, { status: 200 });
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
    console.error('PUT /api/categories/[id] error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const authCheck = await checkAuthAndGetCategory(req, id);
    if (authCheck.errorRes) return authCheck.errorRes;

    const { userId } = authCheck;

    const deletedCategory = await deleteCategoryAndCascade(id, userId!);
    
    return NextResponse.json({ data: deletedCategory }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/categories/[id] error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

