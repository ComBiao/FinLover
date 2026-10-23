import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db';
import { walletInvitationInput } from '@/shared/contracts';
import { apiErrorResponse, readJsonBody } from '@/server/shared/http/errors';
import { validationFields } from '@/shared/contracts/validation';
import { AppError } from '@/server/shared/kernel/AppError';
import type { RouteContext } from '@/server/shared/http/policy';
import type { WalletInvitationService } from '../services/WalletInvitationService';

export class WalletInvitationController {
  constructor(private service: WalletInvitationService) {}
  async invite(request: Request, { params, principal }: RouteContext) {
    try {
      const parsed = walletInvitationInput.safeParse(await readJsonBody(request));
      if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'One or more fields are invalid', validationFields(parsed.error));
      await connectDB();
      const data = await this.service.invite((await params).id, principal!.userId, parsed.data.email);
      return NextResponse.json({ data }, { status: 201 });
    } catch (error) { return apiErrorResponse(error); }
  }
  async list(_request: Request, { principal }: RouteContext) {
    try {
      await connectDB();
      return NextResponse.json({ data: await this.service.list(principal!.userId) });
    } catch (error) { return apiErrorResponse(error); }
  }
  async respond(_request: Request, { params, principal }: RouteContext, action: 'accept' | 'decline') {
    try {
      await connectDB();
      const data = await this.service.respond((await params).id, principal!.userId, action);
      // versioned() treats a raw 204 as the v1 success data:null envelope.
      return data === null ? new NextResponse(null, { status: 204 }) : NextResponse.json({ data });
    } catch (error) { return apiErrorResponse(error); }
  }
}
