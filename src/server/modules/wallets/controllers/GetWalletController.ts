import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import type { RouteContext } from '@/server/shared/http/policy';
import { walletErrorResponse } from '@/server/shared/http/wallet-errors';
import type { GetWalletService } from '../services/GetWalletService';

export class GetWalletController {
  constructor(private service: GetWalletService) {}

  async handle(_request: Request, { params, principal }: RouteContext) {
    try {
      const { id } = await params;
      await connectDB();
      return NextResponse.json({ data: await this.service.execute(id, principal!.userId) });
    } catch (error) { return walletErrorResponse(error); }
  }
}
