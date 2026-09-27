import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import type { RouteContext } from '@/server/shared/http/policy';
import { categoryErrorResponse, readCategoryBody } from '@/server/shared/http/category-errors';
import type { UpdateCategoryService } from '../services/UpdateCategoryService';
export class UpdateCategoryController {
  constructor(private service: UpdateCategoryService) {}
  async handle(req: Request, { params, principal }: RouteContext) {
    try {
      const { id } = await params;
      const body = await readCategoryBody(req);
      await connectDB();
      return NextResponse.json({ data: await this.service.execute(id, principal!.userId, body) });
    } catch (error) { return categoryErrorResponse(error); }
  }
}
