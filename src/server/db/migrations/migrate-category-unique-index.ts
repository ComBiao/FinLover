/**
 * Migration: allow the same category name for different transaction types.
 *
 * Run once against each environment before deploying default-category seeding:
 *
 *   node --import tsx src/server/db/migrations/migrate-category-unique-index.ts
 *
 * The migration replaces the old unique (userId, name) index with the unique
 * (userId, type, name) index required for income and expense "Others" rows.
 */

import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(import.meta.dirname, '../../../../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set. Aborting.');
  process.exit(1);
}

async function migrate() {
  await mongoose.connect(MONGODB_URI as string);
  const collection = mongoose.connection.db!.collection('categories');
  const indexes = await collection.indexes();

  if (indexes.some((index) => index.name === 'userId_1_name_1')) {
    await collection.dropIndex('userId_1_name_1');
  }
  await collection.createIndex(
    { userId: 1, type: 1, name: 1 },
    { unique: true, name: 'userId_1_type_1_name_1' },
  );

  console.log('Category unique index migration complete.');
  await mongoose.disconnect();
}

migrate().catch(() => {
  console.error('Category unique index migration failed.');
  process.exitCode = 1;
});
