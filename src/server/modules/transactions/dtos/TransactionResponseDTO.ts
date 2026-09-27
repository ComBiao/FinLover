import type { TransactionRecord } from '@/server/shared/ports/transactions';
export class TransactionResponseDTO {
  static legacy(doc: TransactionRecord) { return { id: doc.id, wallet_id: doc.walletId, category_id: doc.categoryId ?? null, type: doc.type, amount: doc.amount, date: doc.date.toISOString().split('T')[0], note: doc.note }; }
  static v1(doc: TransactionRecord) { return { id: doc.id, walletId: doc.walletId, categoryId: doc.categoryId ?? null, type: doc.type, amount: doc.amount, date: doc.date.toISOString().split('T')[0], note: doc.note }; }
}
