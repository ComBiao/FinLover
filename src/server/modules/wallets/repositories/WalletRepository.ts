import "server-only";
import Wallet from '@/server/db/models/Wallet';
import { sessionOf } from '@/server/db/unit-of-work';
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import type { WalletAccess } from '@/server/shared/ports/transactions';
import { AppError } from '@/server/shared/kernel/AppError';
export class WalletRepository implements WalletAccess {
  async exists(id: string, userId: string, context: TransactionContext) { return !!(await Wallet.findOne({ _id: id, userId }).session(sessionOf(context)!).lean()); }
  async adjust(id: string, userId: string, delta: number, context: TransactionContext) {
    const result = await Wallet.updateOne({ _id: id, userId }, { $inc: { balance: delta } }, { session: sessionOf(context) });
    if (!result.matchedCount) throw new AppError('NOT_FOUND', 'Wallet not found');
  }
}
