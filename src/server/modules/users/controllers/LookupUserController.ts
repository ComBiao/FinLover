import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import { apiErrorResponse } from '@/server/shared/http/errors';
import type { RouteContext } from '@/server/shared/http/policy';
import type { LookupUserService } from '../services/LookupUserService';

export class LookupUserController {
  constructor(private service: LookupUserService) {}

  async handle(request: Request, context: RouteContext) {
    try {
      await connectDB();
      const url = new URL(request.url);
      const email = url.searchParams.get('email');
      const data = await this.service.execute(email, context.principal?.userId);
      return NextResponse.json({ data });
    } catch (error) {
      return apiErrorResponse(error);
    }
  }
}
