import { seedTransaction } from '@/test/transaction-fixture';
import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import Category from '../Category';
import Transaction from '../Transaction';
import User from '../User';
import Wallet from '../Wallet';
import { UpdateTransactionService } from '@/server/modules/transactions/services/UpdateTransactionService';
import { TransactionRepository } from '@/server/modules/transactions/repositories/TransactionRepository';
import { WalletRepository } from '@/server/modules/wallets/repositories/WalletRepository';
import { CategoryRepository } from '@/server/modules/categories/repositories/CategoryRepository';
import { MongoUnitOfWork } from '@/server/db/unit-of-work';

let mongoServer: MongoMemoryReplSet;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create();
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
    const tx = await seedTransaction(new Transaction({
      userId: user._id,
      walletId: wallet._id,
      categoryId: incomeCat._id,
      type: 'income',
      amount: 100,
      date: new Date(),
      title: 'Test transaction',
    }));

    // Try to update the transaction's category to an expense category
    let err: Error | null = null;
    try {
      const service = new UpdateTransactionService(new TransactionRepository(), new WalletRepository(), new CategoryRepository(), new MongoUnitOfWork());
      await service.execute(String(tx._id), String(user._id), { walletId: String(wallet._id), categoryId: String(expenseCat._id), type: tx.type, amount: tx.amount, date: tx.date, title: tx.title ?? 'Test transaction' });
    } catch (e) {
      err = e as Error;
    }

    expect(err).not.toBeNull();
    if (err) {
      expect(err).toMatchObject({ code: 'VALIDATION_ERROR' });
    }
  });
});
