import { apiErrorResponse, errorResponse } from '@/server/shared/http/errors';
import type { WalletReaderPort } from '@/server/shared/ports/wallets';
import type { UserDirectoryPort } from '@/server/shared/ports/users';
import type { TransactionRepositoryPort } from '@/server/shared/ports/transactions';
import type { RouteContext } from '@/server/shared/http/policy';
import { NextResponse } from 'next/server';
import { connectDB } from '@/server/db/index';
import { currentMonth, monthBoundaries } from '@/server/modules/transactions/services/GetTransactionsByMonthService';
import { applicationTimezone } from '@/server/shared/config/env';

export class ListWalletTransactionsController {
  constructor(
    private wallets: WalletReaderPort,
    private users: UserDirectoryPort,
    private transactions: Pick<TransactionRepositoryPort, 'findByWalletAndDateRange'>,
  ) {}

  async handle(req: Request, { params, principal }: RouteContext) {
    try {
      const userId = principal!.userId;
      const { id } = await params;
      if (!/^[a-f0-9]{24}$/i.test(id)) {
        return errorResponse(400, 'VALIDATION_ERROR', 'Invalid wallet id format', { id: 'must be a valid ObjectId' });
      }

      await connectDB();
      const wallet = await this.wallets.findAccessible(id, userId);
      if (!wallet.isShared) {
        return errorResponse(400, 'VALIDATION_ERROR', 'Transactions endpoint is only available for shared wallets', { id: 'Wallet is not a shared wallet' });
      }

      const url = new URL(req.url);
      const requestedMonth = url.searchParams.get('month') || undefined;
      if (requestedMonth && !/^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)) {
        return errorResponse(400, 'VALIDATION_ERROR', 'One or more fields are invalid', { month: 'month must use YYYY-MM format' });
      }

      const month = requestedMonth ?? currentMonth(new Date(), applicationTimezone());
      const { start, end } = monthBoundaries(month);

      const docs = this.transactions.findByWalletAndDateRange
        ? await this.transactions.findByWalletAndDateRange(id, start, end)
        : [];

      const userIds = new Set<string>();
      for (const doc of docs) {
        if (doc.userId) userIds.add(String(doc.userId));
        if (doc.updatedBy) userIds.add(String(doc.updatedBy));
      }

      const publicUsers = await this.users.findPublicByIds(Array.from(userIds));
      const userMap = new Map(publicUsers.map(u => [u.id, u.name]));

      const items = docs.map(doc => {
        const authorId = String(doc.userId);
        const authorName = userMap.get(authorId) ?? 'Deleted user';
        const createdBy = { id: authorId, name: authorName };

        let editedBy: { id: string; name: string } | undefined;
        if (doc.updatedBy && String(doc.updatedBy) !== authorId) {
          const editorId = String(doc.updatedBy);
          const editorName = userMap.get(editorId) ?? 'Deleted user';
          editedBy = { id: editorId, name: editorName };
        }

        const item: Record<string, unknown> = {
          id: String(doc.id),
          walletId: String(doc.walletId),
          type: doc.type,
          amount: Number(doc.amount),
          date: doc.date instanceof Date ? doc.date.toISOString().split('T')[0] : String(doc.date).split('T')[0],
          title: doc.title ?? '(untitled)',
          createdBy,
        };
        if (doc.note !== undefined && doc.note !== null) {
          item.note = doc.note;
        }
        if (editedBy) {
          item.editedBy = editedBy;
        }
        return item;
      });

      return NextResponse.json({ data: items });
    } catch (error) {
      return apiErrorResponse(error);
    }
  }
}
