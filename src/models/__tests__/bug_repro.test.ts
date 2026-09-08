import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Category from '../Category';
import Transaction from '../Transaction';
import User from '../User';
import Wallet from '../Wallet';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Transaction categoryId validation bug', () => {
  it('should fail when updating categoryId to a category with a mismatched type', async () => {
    const user = await User.create({ email: 'test@test.com', passwordHash: 'hash', dataPrivacyConsent: true });
    const wallet = await Wallet.create({ userId: user._id, name: 'Main', balance: 0 });
    
    const incomeCat = await Category.create({ userId: user._id, name: 'Salary', type: 'income', icon: 'money' });
    const expenseCat = await Category.create({ userId: user._id, name: 'Food', type: 'expense', icon: 'food' });

    // Create an income transaction
    const tx = await Transaction.create({
      userId: user._id,
      walletId: wallet._id,
      categoryId: incomeCat._id,
      type: 'income',
      amount: 100,
      date: new Date()
    });

    // Try to update the transaction's category to an expense category
    let err: Error | null = null;
    try {
      await Transaction.findOneAndUpdate(
        { _id: tx._id },
        { $set: { categoryId: expenseCat._id } },
        { runValidators: true }
      );
    } catch (e) {
      err = e as Error;
    }

    expect(err).not.toBeNull();
    if (err) {
      expect(err.name).toBe('ValidationError');
    }
  });
});
