import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import { apiErrorResponse } from '@/server/shared/http/errors';
import type { RouteContext } from '@/server/shared/http/policy';
import type { CurrentUser } from '@/shared/contracts';
import type { GetCurrentUserService } from '../services/GetCurrentUserService';

/** GET /api/v1/auth/me — the authenticated principal's own profile; never carries `passwordHash`. */
export class GetCurrentUserController {
  constructor(private service: GetCurrentUserService) {}
  async handle(_req: Request, { principal }: RouteContext) {
    try {
      await connectDB();
      const user = await this.service.execute(principal!.userId);
      const currentUser: CurrentUser = { id: String(user._id), email: user.email, ...(user.name ? { name: user.name } : {}) };
      return NextResponse.json({ user: currentUser });
    } catch (error) { return apiErrorResponse(error); }
  }
}
