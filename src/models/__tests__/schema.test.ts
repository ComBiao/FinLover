/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Wallet from '../Wallet';
import Category from '../Category';
import Transaction from '../Transaction';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 60000);

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

describe('Mongoose Schema Validations', () => {
  const validUserId = new mongoose.Types.ObjectId();
  const validWalletId = new mongoose.Types.ObjectId();
  const validCategoryId = new mongoose.Types.ObjectId();
  
  // ==========================================
  // WALLET MODEL TESTS
  // ==========================================
  describe('Wallet Model', () => {
    it('should successfully save a valid Wallet with defaults', async () => {
      const validWallet = new Wallet({
        userId: validUserId,
        name: ' Main Wallet ',
      });
      const savedWallet = await validWallet.save();
      
      expect(savedWallet._id).toBeDefined();
      expect(savedWallet.userId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(savedWallet.name).toBe('Main Wallet'); // Trimmed
      expect(savedWallet.balance).toBe(0); // Default balance
      expect(savedWallet.isDefault).toBe(false); // Default isDefault
    });

    it('should auto-generate timestamps on save', async () => {
      const wallet = new Wallet({
        userId: validUserId,
        name: 'Timestamped Wallet',
      });
      const saved = await wallet.save();

      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);
    });

    it('should fail validation without required fields (name, userId)', async () => {
      const invalidWallet = new Wallet({});
      
      let err: mongoose.Error.ValidationError | null = null;
      try {
        await invalidWallet.save();
      } catch (error: any) {
        err = error;
      }
      
      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err?.errors.name).toBeDefined();
      expect(err?.errors.userId).toBeDefined();
    });

    it('should enforce unique compound index on userId + name', async () => {
      await new Wallet({ userId: validUserId, name: 'Savings' }).save();

      let err: any = null;
      try {
        await new Wallet({ userId: validUserId, name: 'Savings' }).save();
      } catch (error: any) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.code).toBe(11000); // MongoDB duplicate key error code
    });

    it('should allow same wallet name for different users', async () => {
      const otherUserId = new mongoose.Types.ObjectId();
      await new Wallet({ userId: validUserId, name: 'Shared Name' }).save();

      const secondWallet = await new Wallet({ userId: otherUserId, name: 'Shared Name' }).save();
      expect(secondWallet._id).toBeDefined();
    });
  });

  // ==========================================
  // CATEGORY MODEL TESTS
  // ==========================================
  describe('Category Model', () => {
    it('should successfully save a valid Category with defaults', async () => {
      const validCategory = new Category({
        userId: validUserId,
        name: 'Groceries',
        type: 'expense',
      });
      const savedCategory = await validCategory.save();
      
      expect(savedCategory._id).toBeDefined();
      expect(savedCategory.isSystem).toBe(false); // Default value
    });

    it('should save a Category with optional color field', async () => {
      const categoryWithColor = new Category({
        userId: validUserId,
        name: 'Salary',
        type: 'income',
        color: '#4CAF50',
      });
      const saved = await categoryWithColor.save();

      expect(saved.color).toBe('#4CAF50');
    });

    it('should fail validation with invalid enum type', async () => {
      const invalidCategory = new Category({
        userId: validUserId,
        name: 'Lottery',
        type: 'gambling', // Invalid enum
      });

      let err: mongoose.Error.ValidationError | null = null;
      try {
        await invalidCategory.save();
      } catch (error: any) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err?.errors.type).toBeDefined();
    });

    it('should fail validation if name exceeds max length (50 chars)', async () => {
      const longNameCategory = new Category({
        userId: validUserId,
        name: 'a'.repeat(51),
        type: 'expense'
      });

      let err: mongoose.Error.ValidationError | null = null;
      try {
        await longNameCategory.save();
      } catch (error: any) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err?.errors.name).toBeDefined();
    });

    it('should accept a name at exactly the max length (50 chars)', async () => {
      const maxNameCategory = new Category({
        userId: validUserId,
        name: 'a'.repeat(50),
        type: 'income',
      });
      const saved = await maxNameCategory.save();

      expect(saved.name).toHaveLength(50);
    });

    it('should enforce unique compound index on userId + name', async () => {
      await new Category({ userId: validUserId, name: 'Food', type: 'expense' }).save();

      let err: any = null;
      try {
        await new Category({ userId: validUserId, name: 'Food', type: 'expense' }).save();
      } catch (error: any) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.code).toBe(11000); // MongoDB duplicate key error code
    });

    it('should allow same category name for different users', async () => {
      const otherUserId = new mongoose.Types.ObjectId();
      await new Category({ userId: validUserId, name: 'Transport', type: 'expense' }).save();

      const secondCategory = await new Category({ userId: otherUserId, name: 'Transport', type: 'expense' }).save();
      expect(secondCategory._id).toBeDefined();
    });
  });

  // ==========================================
  // TRANSACTION MODEL TESTS
  // ==========================================
  describe('Transaction Model', () => {

    it('should successfully save a valid Transaction & strict type cast ObjectIds', async () => {
      const validTransaction = new Transaction({
        userId: validUserId.toString(),
        walletId: validWalletId.toString(),
        categoryId: validCategoryId.toString(), 
        amount: 100.50,
        type: 'income',
        date: new Date(),
      });
      const savedTransaction = await validTransaction.save();
      
      expect(savedTransaction._id).toBeDefined();
      expect(savedTransaction.userId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(savedTransaction.walletId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(savedTransaction.categoryId).toBeInstanceOf(mongoose.Types.ObjectId);
    });

    it('should successfully save a Transaction without a categoryId (optionality)', async () => {
      const noCategoryTransaction = new Transaction({
        userId: validUserId,
        walletId: validWalletId,
        amount: 50,
        type: 'expense',
        date: new Date(),
      });
      const savedTransaction = await noCategoryTransaction.save();
      
      expect(savedTransaction._id).toBeDefined();
      expect(savedTransaction.categoryId).toBeNull(); 
    });

    it('should auto-generate timestamps on save', async () => {
      const tx = new Transaction({
        userId: validUserId,
        walletId: validWalletId,
        amount: 25,
        type: 'expense',
        date: new Date(),
      });
      const saved = await tx.save();

      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);
    });

    it('should fail validation without required fields (userId, walletId, amount, date)', async () => {
      const invalidTransaction = new Transaction({
        type: 'expense'
      });

      let err: mongoose.Error.ValidationError | null = null;
      try {
        await invalidTransaction.save();
      } catch (error: any) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err?.errors.userId).toBeDefined();
      expect(err?.errors.walletId).toBeDefined();
      expect(err?.errors.amount).toBeDefined();
      expect(err?.errors.date).toBeDefined();
    });

    it('should fail validation if amount is zero or negative', async () => {
      const zeroAmountTx = new Transaction({
        userId: validUserId,
        walletId: validWalletId,
        amount: 0, // Invalid: zero
        type: 'expense',
        date: new Date(),
      });
      
      const negativeAmountTx = new Transaction({
        userId: validUserId,
        walletId: validWalletId,
        amount: -10, // Invalid: negative
        type: 'expense',
        date: new Date(),
      });

      let err1: mongoose.Error.ValidationError | null = null;
      let err2: mongoose.Error.ValidationError | null = null;
      
      try { await zeroAmountTx.save(); } catch (e: any) { err1 = e; }
      try { await negativeAmountTx.save(); } catch (e: any) { err2 = e; }

      expect(err1).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err1?.errors.amount).toBeDefined();
      
      expect(err2).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err2?.errors.amount).toBeDefined();
    });

    it('should fail validation with invalid enum type', async () => {
      const invalidTypeTx = new Transaction({
        userId: validUserId,
        walletId: validWalletId,
        amount: 100,
        type: 'transfer', // Invalid enum
        date: new Date(),
      });

      let err: mongoose.Error.ValidationError | null = null;
      try {
        await invalidTypeTx.save();
      } catch (error: any) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err?.errors.type).toBeDefined();
    });
  });
});
