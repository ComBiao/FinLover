import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import type { RouteContext } from '@/server/shared/http/policy';
import { readWalletBody, walletErrorResponse } from '@/server/shared/http/wallet-errors';
import type { CreateWalletService } from '../services/CreateWalletService';

export class CreateWalletController {
  constructor(private service: CreateWalletService) {}

  async handle(request: Request, { principal }: RouteContext) {
    try {
      const body = await readWalletBody(request);
      await connectDB();
      return NextResponse.json({ data: await this.service.execute(principal!.userId, body) }, { status: 201 });
    } catch (error) {
      return walletErrorResponse(error);
    }
  }
}
