import { apiErrorResponse, errorResponse, readJsonBody, validationFields } from '@/server/shared/http/errors';
import { TransactionResponseDTO } from '../dtos/TransactionResponseDTO';
import type { UpdateTransactionService } from '../services/UpdateTransactionService';
import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import mongoose from 'mongoose';
import { legacyTransactionUpdate } from '@/shared/contracts';
import type { RouteContext } from '@/server/shared/http/policy';

export class UpdateTransactionController {
  constructor(private service: UpdateTransactionService) {}
  async handle(req: Request, { params, principal }: RouteContext) {
    try {
      const user_id = principal!.userId;

      const { id } = await params;
      const body = await readJsonBody(req);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(422, 'VALIDATION_ERROR', 'Invalid transaction id format', { id: 'must be a valid ObjectId' });
      }

      const parsed = legacyTransactionUpdate.safeParse(body);

      if (!parsed.success) {
        return errorResponse(422, 'VALIDATION_ERROR', 'One or more fields are invalid', validationFields(parsed.error));
      }

      const { wallet_id, category_id, category_key, type, amount, date, title, note } = parsed.data;
      const hasWallet = typeof body === 'object' && body !== null && (
        ('wallet_id' in body && (body as Record<string, unknown>).wallet_id !== undefined) ||
        ('walletId' in body && (body as Record<string, unknown>).walletId !== undefined)
      );

      await connectDB();
      const tx = await this.service.execute(id, user_id, {
        walletId: wallet_id,
        categoryId: category_id || null,
        categoryKey: category_key,
        type: type.toLowerCase() as 'income' | 'expense',
        amount,
        date: new Date(date),
        title,
        note,
        explicitWallet: hasWallet,
      });
      const data = tx.createdBy ? TransactionResponseDTO.shared(tx) : TransactionResponseDTO.legacy(tx);
      return NextResponse.json({ data });

    } catch (error) {
      return apiErrorResponse(error, { validationStatus: 422 });
    }
  }
}
