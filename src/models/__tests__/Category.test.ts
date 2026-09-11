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
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Category from '../Category';
import Transaction from '../Transaction';
import Wallet from '../Wallet';
import { deleteCategoryAndCascade } from '@/lib/services/categoryService';

// ---------------------------------------------------------------------------
// Test DB lifecycle
// ---------------------------------------------------------------------------
let mongoServer: MongoMemoryReplSet;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
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
// EPIC 3 — Category Management
// ===========================================================================
describe('EPIC 3 — Category Management', () => {

  // =========================================================================
  // US3-1 — Create a custom category with name and type
  // =========================================================================
  describe('US3-1 — Create a custom category', () => {
    /**
     * AC: When the user attempts to create a category with name "Pet Supplies"
     * and type "Expense" and icon, the system should allow the action.
     */
    it('AC1 — saves a valid category with name, type, and makes it available for selection', async () => {
      const cat = await makeCategory({ name: 'Pet Supplies', type: 'expense' }).save();

      expect(cat._id).toBeDefined();
      expect(cat.name).toBe('Pet Supplies');
      expect(cat.type).toBe('expense');
      expect(cat.isSystem).toBe(false); // user-created by default

      // Verify it can be fetched (available for selection)
      const found = await Category.findById(cat._id);
      expect(found).not.toBeNull();
    });

    it('AC1 — saves a valid income category', async () => {
      const cat = await makeCategory({ name: 'Salary', type: 'income' }).save();
      expect(cat.type).toBe('income');
    });

    /**
     * AC: Duplicate name "Food"/"Expense" that already exists → error, do not create.
     */
    it('AC2 — rejects a duplicate category name for the same user (duplicate name + type)', async () => {
      await makeCategory({ name: 'Food', type: 'expense' }).save();

      let err: any = null;
      try {
        await makeCategory({ name: 'Food', type: 'expense' }).save();
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeDefined();
      // MongoDB duplicate-key error code
      expect(err.code).toBe(11000);
    });

    it('AC2 — rejects a blank category name', async () => {
      let err: mongoose.Error.ValidationError | null = null;
      try {
        await makeCategory({ name: '' }).save();
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err?.errors.name).toBeDefined();
    });

    it('AC2 — rejects when required fields (userId, name, type) are missing', async () => {
      let err: mongoose.Error.ValidationError | null = null;
      try {
        await new Category({}).save();
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err?.errors.userId).toBeDefined();
      expect(err?.errors.name).toBeDefined();
      expect(err?.errors.type).toBeDefined();
    });

    it('AC2 — rejects an invalid type value (not income/expense)', async () => {
      let err: mongoose.Error.ValidationError | null = null;
      try {
        await makeCategory({ type: 'gambling' }).save();
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err?.errors.type).toBeDefined();
    });

    it('AC2 — rejects a name exceeding max length (50 chars)', async () => {
      let err: mongoose.Error.ValidationError | null = null;
      try {
        await makeCategory({ name: 'x'.repeat(51) }).save();
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err?.errors.name).toBeDefined();
    });

    it('boundary — accepts a name at exactly the max length (50 chars)', async () => {
      const cat = await makeCategory({ name: 'x'.repeat(50) }).save();
      expect(cat.name).toHaveLength(50);
    });

    it('timestamps — auto-generates createdAt and updatedAt on save', async () => {
      const cat = await makeCategory().save();
      expect(cat.createdAt).toBeInstanceOf(Date);
      expect(cat.updatedAt).toBeInstanceOf(Date);
    });
  });

  // =========================================================================
  // US3-3 / US3-4 — isSystem guard (fundamental categories are immutable)
  // =========================================================================
  describe('isSystem guard — fundamental categories cannot be edited or deleted', () => {
    it('US3-3 guard — throws when attempting to update a system category', async () => {
      const systemCat = await makeCategory({ name: 'Food', isSystem: true }).save();

      let err: any = null;
      try {
        await Category.findOneAndUpdate(
          { _id: systemCat._id },
          { $set: { name: 'Junk Food' } }
        );
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toMatch(/System categories cannot be modified/);
    });

    it('US3-3 guard — prevents bypassing isSystem via save() by setting it to false', async () => {
      const systemCat = await makeCategory({ name: 'Food', isSystem: true }).save();

      let err: any = null;
      try {
        systemCat.isSystem = false;
        systemCat.name = 'Hacked Food';
        await systemCat.save();
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toMatch(/System categories cannot be modified/);
      
      const inDb = await Category.findById(systemCat._id);
      expect(inDb?.name).toBe('Food');
    });

    it('US3-3 guard — allows updating a non-system category', async () => {
      const cat = await makeCategory({ name: 'Coffee', isSystem: false }).save();

      const updated = await Category.findOneAndUpdate(
        { _id: cat._id },
        { $set: { name: 'Espresso' } },
        { new: true }
      );

      expect(updated?.name).toBe('Espresso');
    });

    it('US3-4 guard — throws when attempting to delete a system category', async () => {
      const systemCat = await makeCategory({ name: 'Travel', isSystem: true }).save();

      let err: any = null;
      try {
        await Category.findOneAndDelete({ _id: systemCat._id });
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toMatch(/System categories cannot be deleted/);

      // Category must still exist
      const still = await Category.findById(systemCat._id);
      expect(still).not.toBeNull();
    });

    it('US3-4 guard — cascade hook does NOT run when system guard blocks deletion', async () => {
      const systemCat = await makeCategory({ name: 'Travel', isSystem: true }).save();
      const tx = await makeTransaction({ categoryId: systemCat._id }).save();

      try {
        await Category.findOneAndDelete({ _id: systemCat._id });
      } catch {
        // expected
      }

      // Transaction should still have its original categoryId — cascade was never triggered
      const unchangedTx = await Transaction.findById(tx._id);
      expect(unchangedTx?.categoryId?.toString()).toBe(systemCat._id.toString());
    });

    it('US3-4 guard — allows deleting a non-system category', async () => {
      const cat = await makeCategory({ name: 'Misc', isSystem: false }).save();
      await Category.findOneAndDelete({ _id: cat._id });

      const found = await Category.findById(cat._id);
      expect(found).toBeNull();
    });

    // --- updateOne / deleteOne guards (bypass-prevention) ---

    it('US3-3 guard — throws when attempting to updateOne a system category', async () => {
      const systemCat = await makeCategory({ name: 'Transport', isSystem: true }).save();

      let err: any = null;
      try {
        await Category.updateOne(
          { _id: systemCat._id },
          { $set: { name: 'Vehicles' } }
        );
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toMatch(/System categories cannot be modified/);
    });

    it('US3-3 guard — allows updateOne on a non-system category', async () => {
      const cat = await makeCategory({ name: 'Snacks', isSystem: false }).save();

      await Category.updateOne(
        { _id: cat._id },
        { $set: { name: 'Treats' } }
      );

      const updated = await Category.findById(cat._id);
      expect(updated?.name).toBe('Treats');
    });

    it('US3-4 guard — throws when attempting to deleteOne a system category', async () => {
      const systemCat = await makeCategory({ name: 'Salary', type: 'income', isSystem: true }).save();

      let err: any = null;
      try {
        await Category.deleteOne({ _id: systemCat._id });
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.message).toMatch(/System categories cannot be deleted/);

      const still = await Category.findById(systemCat._id);
      expect(still).not.toBeNull();
    });

    it('US3-4 guard — allows deleteOne on a non-system category', async () => {
      const cat = await makeCategory({ name: 'Hobby', isSystem: false }).save();
      await Category.deleteOne({ _id: cat._id });

      const found = await Category.findById(cat._id);
      expect(found).toBeNull();
    });
  });


  // =========================================================================
  describe('US3-2 — View categories grouped by type', () => {
    it('can retrieve all categories for a user and they can be grouped by type', async () => {
      await makeCategory({ name: 'Food', type: 'expense' }).save();
      await makeCategory({ name: 'Transport', type: 'expense' }).save();
      await makeCategory({ name: 'Salary', type: 'income' }).save();

      const all = await Category.find({ userId });
      const grouped = all.reduce<Record<string, typeof all>>((acc, c) => {
        acc[c.type] = acc[c.type] || [];
        acc[c.type].push(c);
        return acc;
      }, {});

      expect(grouped['expense']).toHaveLength(2);
      expect(grouped['income']).toHaveLength(1);
    });

    it('returns an empty array when the user has no categories', async () => {
      const categories = await Category.find({ userId: new mongoose.Types.ObjectId() });
      expect(categories).toHaveLength(0);
    });

    it('does not return categories belonging to other users', async () => {
      await makeCategory({ userId: userId2, name: 'Other User Food', type: 'expense' }).save();

      const myCategories = await Category.find({ userId });
      expect(myCategories).toHaveLength(0);
    });
  });

  // =========================================================================
  // US3-3 — Edit a category's name or details
  // =========================================================================
  describe('US3-3 — Edit a category', () => {
    /**
     * AC: Given an existing non-fundamental category "Coffee", when the user
     * renames it to "Home Brewing", the system should allow the action.
     */
    it('AC1 — allows renaming a non-system category', async () => {
      const cat = await makeCategory({ name: 'Coffee', type: 'expense', isSystem: false }).save();

      const updated = await Category.findOneAndUpdate(
        { _id: cat._id },
        { $set: { name: 'Home Brewing' } },
        { new: true }
      );

      expect(updated?.name).toBe('Home Brewing');
    });

    /**
     * AC: Renaming "Food" to "Transport" which already exists for same type → error.
     */
    it('AC2 — rejects renaming to a name that already exists for the same user (duplicate key)', async () => {
      await makeCategory({ name: 'Transport', type: 'expense' }).save();
      const coffee = await makeCategory({ name: 'Coffee', type: 'expense' }).save();

      let err: any = null;
      try {
        await Category.findOneAndUpdate(
          { _id: coffee._id },
          { $set: { name: 'Transport' } },
          { runValidators: true }
        );
      } catch (e: any) {
        err = e;
      }

      expect(err).toBeDefined();
      expect(err.code).toBe(11000);
    });

    it('same name is allowed for a different user', async () => {
      await makeCategory({ userId: userId2, name: 'Food', type: 'expense' }).save();

      // Different user can also have 'Food' — should not conflict
      const cat = await makeCategory({ name: 'Food', type: 'expense' }).save();
      expect(cat._id).toBeDefined();
    });
  });

  // =========================================================================
  // US3-4 — Delete a category
  // =========================================================================
  describe('US3-4 — Delete a category', () => {
    /**
     * AC: A non-fundamental category "Misc" can be deleted.
     */
    it('AC1 — successfully deletes a non-system category', async () => {
      const cat = await makeCategory({ name: 'Misc', type: 'expense', isSystem: false }).save();

      await Category.findOneAndDelete({ _id: cat._id });

      const found = await Category.findById(cat._id);
      expect(found).toBeNull();
    });

    /**
     * AC: Deleting a category that has transactions linked → transactions' categoryId
     * is automatically reassigned to null ("Not Chosen").
     */
    it('AC2 — cascade: reassigns linked transactions to null (Not Chosen) on category delete', async () => {
      const cat = await makeCategory({ name: 'Coffee', type: 'expense', isSystem: false }).save();

      // Create two transactions linked to this category
      const tx1 = await makeTransaction({ categoryId: cat._id }).save();
      const tx2 = await makeTransaction({ categoryId: cat._id }).save();

      // Delete through the service so reference cleanup shares the transaction.
      await deleteCategoryAndCascade(cat._id, userId);

      const updatedTx1 = await Transaction.findById(tx1._id);
      const updatedTx2 = await Transaction.findById(tx2._id);

      expect(updatedTx1?.categoryId).toBeNull();
      expect(updatedTx2?.categoryId).toBeNull();
    });

    it('AC2 — transactions without this category are unaffected by the category delete', async () => {
      const catA = await makeCategory({ name: 'Coffee', type: 'expense' }).save();
      const catB = await makeCategory({ name: 'Food',   type: 'expense' }).save();

      const txLinkedToB = await makeTransaction({ categoryId: catB._id }).save();

      // Delete only catA
      await deleteCategoryAndCascade(catA._id, userId);

      const stillLinked = await Transaction.findById(txLinkedToB._id);
      expect(stillLinked?.categoryId?.toString()).toBe(catB._id.toString());
    });
  });

  // =========================================================================
  // US3-5 — Assign an icon to a category
  // =========================================================================
  describe('US3-5 — Assign an icon to a category', () => {
    it('AC1 — schema has the "icon" field (US3-5 implemented)', () => {
      const schemaPaths = Object.keys(Category.schema.paths);
      expect(schemaPaths.includes('icon')).toBe(true);
    });

    it('AC1 — saves a category with an icon and retrieves it correctly', async () => {
      const cat = await makeCategory({ name: 'Groceries', icon: 'shopping-cart' }).save();
      expect(cat.icon).toBe('shopping-cart');

      const found = await Category.findById(cat._id);
      expect(found?.icon).toBe('shopping-cart');
    });

    it('AC1 — allows updating the icon on an existing category', async () => {
      const cat = await makeCategory({ name: 'Groceries', icon: 'cart' }).save();

      const updated = await Category.findOneAndUpdate(
        { _id: cat._id },
        { $set: { icon: 'shopping-bag' } },
        { new: true }
      );
      expect(updated?.icon).toBe('shopping-bag');
    });

    it('AC2 — icon defaults to undefined when not provided', async () => {
      const cat = await makeCategory({ name: 'NoIcon' }).save();
      expect(cat.icon).toBeUndefined();
    });
  });
});

