import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { authenticateRequest } from '@/lib/apiAuth';
import { categoryErrorResponse, readCategoryBody } from '@/lib/categoryErrors';
import { updateCategory, deleteCategory } from '@/lib/services/categoryApplicationService';

type RouteContext = { params: Promise<{ id: string }> };

/** Authenticate and adapt a partial category update to the application service. */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const auth = authenticateRequest(req);
    if (auth.errorRes) return auth.errorRes;
    const { id } = await params;
    const body = await readCategoryBody(req);
    await connectDB();
    return NextResponse.json({ data: await updateCategory(id, auth.userId, body) });
  } catch (error) {
    return categoryErrorResponse(error);
  }
}

/** Authenticate and adapt an atomic category deletion to the application service. */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const auth = authenticateRequest(req);
    if (auth.errorRes) return auth.errorRes;
    const { id } = await params;
    await connectDB();
    return NextResponse.json({ data: await deleteCategory(id, auth.userId) });
  } catch (error) {
    return categoryErrorResponse(error);
  }
}
