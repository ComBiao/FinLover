import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db';
import { transferOwnershipInput } from '@/shared/contracts';
import { AppError } from '@/server/shared/kernel/AppError';
import { apiErrorResponse, readJsonBody } from '@/server/shared/http/errors';
import { validationFields } from '@/shared/contracts/validation';
import type { RouteContext } from '@/server/shared/http/policy';
import type { WalletMembersService } from '../services/WalletMembersService';

export class WalletMembersController {
  constructor(private service: WalletMembersService) {}
  async handle(request: Request, { params, principal }: RouteContext, action: 'list' | 'remove' | 'leave' | 'transfer') {
    try {
      const { id, userId: target } = await params;
      let transferTarget: string | undefined;
      if (action === 'transfer') {
        const parsed = transferOwnershipInput.safeParse(await readJsonBody(request));
        if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', validationFields(parsed.error));
        transferTarget = parsed.data.userId;
      }
      await connectDB();
      if (action === 'list') return NextResponse.json({ data: await this.service.list(id, principal!.userId) });
      if (action === 'transfer') return NextResponse.json({ data: await this.service.transfer(id, principal!.userId, transferTarget!) });
      if (action === 'remove') await this.service.remove(id, principal!.userId, target ?? '');
      else await this.service.leave(id, principal!.userId);
      return new NextResponse(null, { status: 204 });
    } catch (error) { return apiErrorResponse(error); }
  }
}
