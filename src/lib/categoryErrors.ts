import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

/** An expected category request failure that can be exposed to the client. */
export class CategoryError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

/** Map application and database errors to the Category API error envelope. */
export function categoryErrorResponse(error: unknown) {
  if (error instanceof CategoryError) {
    return NextResponse.json({ error: {
      code: error.code, message: error.message,
      ...(error.fields ? { fields: error.fields } : {}),
    } }, { status: error.status });
  }
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    return categoryErrorResponse(new CategoryError(409, 'CONFLICT', 'A category with this name already exists'));
  }
  if (error instanceof mongoose.Error.ValidationError) {
    const fields = Object.fromEntries(Object.entries(error.errors).map(([key, value]) => [key, value.message]));
    return categoryErrorResponse(new CategoryError(400, 'VALIDATION_ERROR', 'Validation failed', fields));
  }
  console.error('Category API error:', error);
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
}

/** Parse JSON separately so malformed syntax is distinguishable from invalid fields. */
export async function readCategoryBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new CategoryError(400, 'INVALID_JSON', 'Malformed JSON body');
  }
}
