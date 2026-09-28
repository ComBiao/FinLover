import Transaction, { type ITransaction } from '@/server/db/models/Transaction';
/** Test-only raw database fixture. Does not represent an application write or sync balances. */
export async function seedTransaction(doc: ITransaction) {
  await doc.validate();
  doc.createdAt = new Date();
  doc.updatedAt = new Date();
  await Transaction.collection.insertOne(doc.toObject({ getters: false, virtuals: false }));
  return Transaction.hydrate(doc.toObject({ getters: false, virtuals: false }));
}
