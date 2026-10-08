import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import type { RouteContext } from '@/server/shared/http/policy';
import { walletErrorResponse } from '@/server/shared/http/wallet-errors';
import type { DeleteWalletService } from '../services/DeleteWalletService';
export class DeleteWalletController {
  constructor(private service: DeleteWalletService) {}
  async handle(_req: Request, { params, principal }: RouteContext) {
    try {
      const { id } = await params;
      await connectDB();
      await this.service.execute(id, principal!.userId);
      return new NextResponse(null, { status: 204 });
    } catch (error) { return walletErrorResponse(error); }
  }
}
