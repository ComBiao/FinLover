/**
 * Migration: convert Transaction.amount from Number -> Decimal128
 *
 * Run once against each environment before deploying the updated Transaction model:
 *
 *   npx tsx scripts/migrate-transaction-amount-decimal128.ts
 *
 * The script is idempotent: documents whose amount field is already stored as
 * Decimal128 are skipped automatically by the $type filter.
 *
 * Prerequisites:
 *   - MONGODB_URI must be set in .env.local (loaded below via dotenv/config).
 *   - Run with Node 18+ / tsx.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set. Aborting.');
  process.exit(1);
}

async function migrate() {
  await mongoose.connect(MONGODB_URI as string);
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db!;
  const collection = db.collection('transactions');

  // BSON type 1 = Double (Number). Only touch documents still stored as Number.
  // $toDecimal converts the existing numeric value to Decimal128 in place.
  const result = await collection.updateMany(
    { amount: { $type: 1 } },
    [{ $set: { amount: { $toDecimal: '$amount' } } }]
  );

  console.log('Migration complete.');
  console.log('  Matched : ' + result.matchedCount);
  console.log('  Modified: ' + result.modifiedCount);

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
