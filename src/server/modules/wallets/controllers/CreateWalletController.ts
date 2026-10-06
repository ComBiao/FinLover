import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db';
import { walletInput } from '@/shared/contracts';
import { apiErrorResponse, errorResponse, readJsonBody, validationFields } from '@/server/shared/http/errors';
import type { RouteContext } from '@/server/shared/http/policy';
import type { CreateWalletService } from '../services/CreateWalletService';

export class CreateWalletController {
  constructor(private service: CreateWalletService) {}

  async handle(request: Request, { principal }: RouteContext) {
    try {
      const parsed = walletInput.safeParse(await readJsonBody(request));
      if (!parsed.success) return errorResponse(400, 'VALIDATION_ERROR', 'One or more fields are invalid', validationFields(parsed.error));
      await connectDB();
      // Parse through the shared schema before persistence so owner and balance fields cannot be assigned by the client.
      const wallet = await this.service.execute(principal!.userId, parsed.data);
      return NextResponse.json({ data: wallet }, { status: 201 });
    } catch (error) {
      return apiErrorResponse(error, { duplicate: { code: 'CONFLICT', message: 'A wallet with this name already exists', fields: { name: 'A wallet with this name already exists' } } });
    }
  }
}
