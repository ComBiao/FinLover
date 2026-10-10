import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import type { RouteContext } from '@/server/shared/http/policy';
import { readWalletBody, walletErrorResponse } from '@/server/shared/http/wallet-errors';
import type { UpdateWalletService } from '../services/UpdateWalletService';

export class UpdateWalletController {
  constructor(private service: UpdateWalletService) {}

  async handle(request: Request, { params, principal }: RouteContext) {
    try {
      const { id } = await params;
      const body = await readWalletBody(request);
      await connectDB();
      return NextResponse.json({ data: await this.service.execute(id, principal!.userId, body) });
    } catch (error) {
      return walletErrorResponse(error);
    }
  }
}
