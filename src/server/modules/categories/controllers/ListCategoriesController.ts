import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import type { RouteContext } from '@/server/shared/http/policy';
import { categoryErrorResponse } from '@/server/shared/http/category-errors';
import type { ListCategoriesService } from '../services/ListCategoriesService';
export class ListCategoriesController {
  constructor(private service: ListCategoriesService) {}
  async handle(req: Request, { principal }: RouteContext) {
    try {
      const type = new URL(req.url).searchParams.get('type') ?? undefined;
      await connectDB();
      return NextResponse.json({ data: await this.service.execute(principal!.userId, { type }) });
    } catch (error) { return categoryErrorResponse(error); }
  }
}
