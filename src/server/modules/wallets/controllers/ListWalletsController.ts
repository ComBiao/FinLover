import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db';
import { apiErrorResponse } from '@/server/shared/http/errors';
import type { RouteContext } from '@/server/shared/http/policy';
import type { ListWalletsService } from '../services/ListWalletsService';

export class ListWalletsController {
  constructor(private service: ListWalletsService) {}

  async handle(_request: Request, context: RouteContext) {
    try {
      await connectDB();
      return NextResponse.json({ data: await this.service.execute(context.principal!.userId) });
    } catch (error) {
      return apiErrorResponse(error);
    }
  }
}
