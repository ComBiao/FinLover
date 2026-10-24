/**
 * Migration: remove the retired `recurrence` sub-document from transactions.
 *
 * Repeating transactions now live in the Scheduler collection. The old field was
 * never read by the application, so nothing is converted. Run once per environment:
 *
 *   npm run db:migrate:unset-transaction-recurrence
 */

import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const root = path.resolve(import.meta.dirname, '../../../..');
dotenv.config({
  path: [path.join(root, '.env.local'), path.join(root, '.env')],
});

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set. Aborting.');
  process.exit(1);
}

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI as string);
    const db = mongoose.connection.db!;
    const exists = (await db.listCollections({ name: 'transactions' }).toArray()).length > 0;
    if (!exists) {
      console.log('No transactions collection; nothing to migrate.');
      return;
    }
    const collection = db.collection('transactions');
    const { modifiedCount } = await collection.updateMany({ recurrence: { $exists: true } }, { $unset: { recurrence: '' } });
    const indexes = await collection.indexes();
    if (indexes.some((index) => index.name === 'recurrence.parentId_1')) {
      await collection.dropIndex('recurrence.parentId_1');
    }
    console.log(`Unset recurrence on ${modifiedCount} transactions.`);
  } finally {
    await mongoose.disconnect();
  }
}

migrate().catch((err) => {
  console.error('Transaction recurrence migration failed:', err);
  process.exitCode = 1;
});
