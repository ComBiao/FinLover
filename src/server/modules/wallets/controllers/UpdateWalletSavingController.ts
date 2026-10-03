import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import type { RouteContext } from '@/server/shared/http/policy';
import { readWalletBody, walletErrorResponse } from '@/server/shared/http/wallet-errors';
import type { UpdateWalletSavingService } from '../services/UpdateWalletSavingService';
export class UpdateWalletSavingController {
  constructor(private service: UpdateWalletSavingService) {}
  async handle(req: Request, { params, principal }: RouteContext) {
    try {
      const { id } = await params;
      const body = await readWalletBody(req);
      await connectDB();
      return NextResponse.json({ data: await this.service.execute(id, principal!.userId, body) });
    } catch (error) { return walletErrorResponse(error); }
  }
}
