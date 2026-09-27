/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Category & Transaction Model Tests
 *
 * Coverage mapped to Product Backlog:
 *  - EPIC 2 Transaction Management: US2-1, US2-2, US2-3, US2-4
 *  - EPIC 3 Category Management:    US3-1, US3-2, US3-3, US3-4, US3-5
 *
 * Each describe/it block is annotated with the User Story + Acceptance Criteria it covers.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Category from '../Category';
import Transaction from '../Transaction';
import Wallet from '../Wallet';

// ---------------------------------------------------------------------------
// Test DB lifecycle
// ---------------------------------------------------------------------------
let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  // Ensure indexes are fully built before tests rely on them
  await Category.init();
  await Transaction.init();
  await Wallet.init();
}, 60_000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  await mongoServer?.stop();
}, 60_000);

beforeEach(async () => {
  // Wipe all collections between tests for isolation
  for (const col of Object.values(mongoose.connection.collections)) {
    await col.deleteMany({});
  }
  await Wallet.create({ _id: walletId, userId, name: 'Fixture wallet' });
});

// ---------------------------------------------------------------------------
// Shared test-data factories
// ---------------------------------------------------------------------------
const userId  = new mongoose.Types.ObjectId();
const userId2 = new mongoose.Types.ObjectId();
const walletId = new mongoose.Types.ObjectId();

function makeCategory(overrides: Record<string, unknown> = {}) {
  return new Category({
    userId,
    name: 'Food',
    type: 'expense',
    ...overrides,
  });
}

function makeTransaction(overrides: Record<string, unknown> = {}) {
  return new Transaction({
    userId,
    walletId,
    amount: 500,
    type: 'expense',
    date: new Date('2026-08-25'),
    ...overrides,
  });
}



// ===========================================================================
// EPIC 2 — Transaction Management
// ===========================================================================
describe('EPIC 2 — Transaction Management', () => {

  // =========================================================================
  // US2-1 — Add a new income or expense transaction
  // =========================================================================
  describe('US2-1 — Add a new transaction', () => {
    /**
     * AC: User adds amount "500.00", date "2026-08-25", type "Expense",
     * category "Food" → system saves and could update balance.
     */
    it('AC1 — saves a valid expense transaction with all fields', async () => {
      const cat = await makeCategory({ name: 'Food', type: 'expense' }).save();

      const tx = await makeTransaction({
        amount: 500.00,
        date: new Date('2026-08-25'),
        type: 'expense',
        categoryId: cat._id,
      }).save();

      expect(tx._id).toBeDefined();
      expect(tx.amount).toBe(500);
      expect(tx.type).toBe('expense');
      expect(tx.categoryId?.toString()).toBe(cat._id.toString());
    });

    /**
     * AC: System automatically assigns type "Expense" when no category selected
     * → categoryId defaults to null ("Not Chosen").
     */
    it('AC2 — saves a transaction without category (categoryId defaults to null)', async () => {
      const tx = await makeTransaction({ categoryId: undefined }).save();
      expect(tx.categoryId).toBeNull();
    });

    it('AC2 — saves a valid income transaction', async () => {
      const tx = await makeTransaction({ type: 'income', amount: 3000 }).save();
      expect(tx.type).toBe('income');
    });

    /**
     * AC: Negative amount → error, do not save.
     */
    it('AC3 — rejects a negative amount', async () => {
      let err: mongoose.Error.ValidationError | null = null;
      try {
        await makeTransaction({ amount: -500 }).save();
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err?.errors.amount).toBeDefined();
    });

    it('AC3 — rejects amount = 0', async () => {
      let err: mongoose.Error.ValidationError | null = null;
      try {
        await makeTransaction({ amount: 0 }).save();
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err?.errors.amount).toBeDefined();
    });

    it('AC3 — rejects amount < 0.01 (e.g. 0.009)', async () => {
      let err: mongoose.Error.ValidationError | null = null;
      try {
        await makeTransaction({ amount: 0.009 }).save();
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err?.errors.amount).toBeDefined();
    });

    it('AC3 — rejects an empty/missing date field', async () => {
      let err: mongoose.Error.ValidationError | null = null;
      try {
        await makeTransaction({ date: undefined }).save();
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err?.errors.date).toBeDefined();
    });

    it('AC3 — rejects missing required fields (userId, walletId, amount, date)', async () => {
      let err: mongoose.Error.ValidationError | null = null;
      try {
        await new Transaction({ type: 'expense' }).save();
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err?.errors.userId).toBeDefined();
      expect(err?.errors.walletId).toBeDefined();
      expect(err?.errors.amount).toBeDefined();
      expect(err?.errors.date).toBeDefined();
    });

    it('AC3 — rejects an invalid type value (not income/expense)', async () => {
      let err: mongoose.Error.ValidationError | null = null;
      try {
        await makeTransaction({ type: 'transfer' }).save();
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err?.errors.type).toBeDefined();
    });

    it('boundary — accepts the minimum valid amount (0.01)', async () => {
      const tx = await makeTransaction({ amount: 0.01 }).save();
      expect(tx.amount).toBe(0.01);
    });

    it('timestamps — auto-generates createdAt and updatedAt', async () => {
      const tx = await makeTransaction().save();
      expect(tx.createdAt).toBeInstanceOf(Date);
      expect(tx.updatedAt).toBeInstanceOf(Date);
    });

    it('ObjectIds — userId, walletId, categoryId are cast to ObjectId', async () => {
      const cat = await makeCategory({ name: 'Food', type: 'expense' }).save();
      const tx = await makeTransaction({ categoryId: cat._id.toString() }).save();

      expect(tx.userId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(tx.walletId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(tx.categoryId).toBeInstanceOf(mongoose.Types.ObjectId);
    });
  });

  // =========================================================================
  // US2-2 — Edit an existing transaction
  // =========================================================================
  describe('US2-2 — Edit a transaction', () => {
    /**
     * AC: Existing transaction amount "500.00" → update to "550.00" → allowed.
     */
    it('AC1 — allows updating the amount of an existing transaction', async () => {
      const tx = await makeTransaction({ amount: 500 }).save();

      const updated = await Transaction.findOneAndUpdate(
        { _id: tx._id },
        { $set: { amount: 550 } },
        { new: true, runValidators: true }
      );

      expect(updated?.amount).toBe(550);
    });

    it('AC1 — allows updating the notes field', async () => {
      const tx = await makeTransaction().save();

      const updated = await Transaction.findOneAndUpdate(
        { _id: tx._id },
        { $set: { notes: 'Updated note' } },
        { new: true, runValidators: true }
      );

      expect(updated?.notes).toBe('Updated note');
    });

    it('AC1 — allows updating the date field', async () => {
      const tx = await makeTransaction().save();
      const newDate = new Date('2026-09-01');

      const updated = await Transaction.findOneAndUpdate(
        { _id: tx._id },
        { $set: { date: newDate } },
        { new: true, runValidators: true }
      );

      expect(updated?.date.getTime()).toBe(newDate.getTime());
    });

    /**
     * AC: Negative amount on edit → error, do not update.
     */
    it('AC2 — rejects updating amount to a negative value', async () => {
      const tx = await makeTransaction({ amount: 500 }).save();

      let err: any = null;
      try {
        await Transaction.findOneAndUpdate(
          { _id: tx._id },
          { $set: { amount: -500 } },
          { runValidators: true }
        );
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeDefined();
      // After failed update, original value should be intact
      const original = await Transaction.findById(tx._id);
      expect(original?.amount).toBe(500);
    });

    it('AC2 — rejects updating amount to zero', async () => {
      const tx = await makeTransaction({ amount: 500 }).save();

      let err: any = null;
      try {
        await Transaction.findOneAndUpdate(
          { _id: tx._id },
          { $set: { amount: 0 } },
          { runValidators: true }
        );
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeDefined();
    });
  });

  // =========================================================================
  // US2-3 — Delete a transaction
  // =========================================================================
  describe('US2-3 — Delete a transaction', () => {
    /**
     * AC: Transaction with ID "TXN-1001" owned by user → delete → removed.
     */
    it('AC1 — successfully deletes an owned transaction', async () => {
      const tx = await makeTransaction().save();

      await Transaction.findOneAndDelete({ _id: tx._id, userId });

      const found = await Transaction.findById(tx._id);
      expect(found).toBeNull();
    });

    /**
     * AC: Transaction NOT owned by user → cannot delete.
     */
    it('AC2 — does not delete a transaction belonging to a different user', async () => {
      // Create a transaction owned by userId2
      const otherTx = await makeTransaction({ userId: userId2 }).save();

      // Attempt to delete using userId (the wrong owner)
      const result = await Transaction.findOneAndDelete({ _id: otherTx._id, userId });

      // findOneAndDelete returns null when filter doesn't match
      expect(result).toBeNull();

      // The transaction should still exist
      const stillExists = await Transaction.findById(otherTx._id);
      expect(stillExists).not.toBeNull();
    });

    it('deleting a non-existent transaction returns null gracefully', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const result = await Transaction.findOneAndDelete({ _id: fakeId, userId });
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // US2-4 — Select a category while adding/editing a transaction
  // =========================================================================
  // Category ownership/type rules are covered in modules/v1/transactions/__tests__/services.test.ts.

  // =========================================================================
  // US2-5 — Schema gap: Recurring transaction fields
  // =========================================================================
  describe('US2-5 — Recurring transactions (schema gap)', () => {
    /**
     * US2-5 fields are nested inside the `recurrence` sub-document.
     */
    it('schema has "recurrence.isRecurring" field', () => {
       
      const recurrencePaths = Object.keys((Transaction.schema.path('recurrence') as any).schema.paths);
      expect(recurrencePaths.includes('isRecurring')).toBe(true);
    });

    it('schema has "recurrence.frequency" field', () => {
       
      const recurrencePaths = Object.keys((Transaction.schema.path('recurrence') as any).schema.paths);
      expect(recurrencePaths.includes('frequency')).toBe(true);
    });

    it('schema has "recurrence.startDate" field', () => {
       
      const recurrencePaths = Object.keys((Transaction.schema.path('recurrence') as any).schema.paths);
      expect(recurrencePaths.includes('startDate')).toBe(true);
    });

    it('schema has "recurrence.parentId" field', () => {
       
      const recurrencePaths = Object.keys((Transaction.schema.path('recurrence') as any).schema.paths);
      expect(recurrencePaths.includes('parentId')).toBe(true);
    });


    it('AC1 — saves a valid recurring transaction with frequency and startDate', async () => {
      const tx = await makeTransaction({
        recurrence: {
          isRecurring: true,
          frequency: 'monthly',
          startDate: new Date('2026-09-01'),
        },
      }).save();

      expect(tx.recurrence.isRecurring).toBe(true);
      expect(tx.recurrence.frequency).toBe('monthly');
      expect(tx.recurrence.startDate).toBeInstanceOf(Date);
    });

    it('AC1 — saves a valid Weekly recurring transaction', async () => {
      const tx = await makeTransaction({
        recurrence: { isRecurring: true, frequency: 'weekly', startDate: new Date('2026-09-01') },
      }).save();

      expect(tx.recurrence.frequency).toBe('weekly');
    });

    it('AC2 — rejects a frequency value outside {Weekly, Monthly}', async () => {
      let err: mongoose.Error.ValidationError | null = null;
      try {
        await makeTransaction({
          recurrence: { isRecurring: true, frequency: 'Daily', startDate: new Date('2026-09-01') },
        }).save();
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    });

    it('AC2 — rejects isRecurring:true without frequency', async () => {
      let err: any = null;
      try {
        await makeTransaction({
          recurrence: { isRecurring: true, startDate: new Date('2026-09-01') },
        }).save();
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors['recurrence.frequency']).toBeDefined();
    });

    it('AC2 — rejects isRecurring:true without startDate', async () => {
      let err: any = null;
      try {
        await makeTransaction({
          recurrence: { isRecurring: true, frequency: 'monthly' },
        }).save();
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors['recurrence.startDate']).toBeDefined();
    });

    it('default — recurrence.isRecurring defaults to false when omitted', async () => {
      const tx = await makeTransaction().save();
      expect(tx.recurrence.isRecurring).toBe(false);
    });

    it('parentId — links a child posting back to its parent rule', async () => {
      const parentTx = await makeTransaction({
        recurrence: { isRecurring: true, frequency: 'monthly', startDate: new Date('2026-09-01') },
      }).save();

      const childTx = await makeTransaction({
        recurrence: { isRecurring: false, parentId: parentTx._id },
      }).save();

      expect(childTx.recurrence.parentId?.toString()).toBe(parentTx._id.toString());
    });
  });

  // =========================================================================
  // Wallet balance sync — US2-1 AC1, US2-2 AC1, US2-3 AC1
  // =========================================================================
  // Balance assertions now exercise services (the only supported application write path).
});
