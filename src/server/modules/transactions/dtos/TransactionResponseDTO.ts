import type { TransactionRecord } from '@/server/shared/ports/transactions';
import { sharedCategoryOf } from '@/shared/contracts';

/** The preset a shared transaction belongs to; rows saved before categories existed count as the type's "Others". */
export function sharedCategory(doc: Pick<TransactionRecord, 'categoryKey' | 'type'>) {
  const { key, name, icon, color } = sharedCategoryOf(doc.categoryKey, doc.type);
  return { key, name, icon, color };
}

export class TransactionResponseDTO {
  static legacy(doc: TransactionRecord) {
    return {
      id: doc.id,
      wallet_id: doc.walletId,
      category_id: doc.categoryId ?? null,
      type: doc.type,
      amount: doc.amount,
      date: doc.date.toISOString().split('T')[0],
      title: doc.title,
      note: doc.note,
    };
  }

  static v1(doc: TransactionRecord) {
    return {
      id: doc.id,
      walletId: doc.walletId,
      categoryId: doc.categoryId ?? null,
      type: doc.type,
      amount: doc.amount,
      date: doc.date.toISOString().split('T')[0],
      title: doc.title,
      ...(doc.note === undefined ? {} : { note: doc.note }),
    };
  }

  static shared(doc: TransactionRecord) {
    const res: Record<string, unknown> = {
      id: doc.id,
      walletId: doc.walletId,
      type: doc.type,
      amount: doc.amount,
      date: doc.date.toISOString().split('T')[0],
      title: doc.title,
      createdBy: doc.createdBy,
      category: sharedCategory(doc),
    };
    if (doc.note !== undefined && doc.note !== null) res.note = doc.note;
    if (doc.editedBy) res.editedBy = doc.editedBy;
    return res;
  }
}
