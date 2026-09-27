import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import type { RouteContext } from '@/server/shared/http/policy';
import { categoryErrorResponse } from '@/server/shared/http/category-errors';
import type { DeleteCategoryService } from '../services/DeleteCategoryService';
export class DeleteCategoryController {
  constructor(private service: DeleteCategoryService) {}
  async handle(req: Request, { params, principal }: RouteContext) {
    try {
      const { id } = await params;
      await connectDB();
      return NextResponse.json({ data: await this.service.execute(id, principal!.userId) });
    } catch (error) { return categoryErrorResponse(error); }
  }
}
