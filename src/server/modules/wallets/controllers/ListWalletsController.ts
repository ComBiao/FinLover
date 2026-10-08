import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import type { RouteContext } from '@/server/shared/http/policy';
import { walletErrorResponse } from '@/server/shared/http/wallet-errors';
import type { ListWalletsService } from '../services/ListWalletsService';

export class ListWalletsController {
  constructor(private service: ListWalletsService) {}

  async handle(_request: Request, { principal }: RouteContext) {
    try {
      await connectDB();
      return NextResponse.json({ data: await this.service.execute(principal!.userId) });
    } catch (error) { return walletErrorResponse(error); }
  }
}
