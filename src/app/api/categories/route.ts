import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { authenticateRequest } from '@/lib/apiAuth';
import { categoryErrorResponse, readCategoryBody } from '@/lib/categoryErrors';
import { createCategory } from '@/lib/services/categoryApplicationService';

/** Authenticate and adapt a category creation request to the application service. */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticateRequest(req);
    if (auth.errorRes) return auth.errorRes;
    const body = await readCategoryBody(req);
    await connectDB();
    return NextResponse.json({ data: await createCategory(auth.userId, body) }, { status: 201 });
  } catch (error) {
    return categoryErrorResponse(error);
  }
}
