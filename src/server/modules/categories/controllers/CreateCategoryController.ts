import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import type { RouteContext } from '@/server/shared/http/policy';
import { categoryErrorResponse, readCategoryBody } from '@/server/shared/http/category-errors';
import type { CreateCategoryService } from '../services/CreateCategoryService';
export class CreateCategoryController {
  constructor(private service: CreateCategoryService) {}
  async handle(req: Request, context: RouteContext) {
    try {
      const body = await readCategoryBody(req);
      await connectDB();
      return NextResponse.json({ data: await this.service.execute(context.principal!.userId, body) }, { status: 201 });
    } catch (error) { return categoryErrorResponse(error); }
  }
}
