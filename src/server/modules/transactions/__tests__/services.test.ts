import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import Wallet from '@/server/db/models/Wallet';
import User from '@/server/db/models/User';
import Category from '@/server/db/models/Category';
import Transaction from '@/server/db/models/Transaction';
import { MongoUnitOfWork } from '@/server/db/unit-of-work';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { WalletRepository } from '../../wallets/repositories/WalletRepository';
import { CategoryRepository } from '../../categories/repositories/CategoryRepository';
import { CreateTransactionService } from '../services/CreateTransactionService';
import { UpdateTransactionService } from '../services/UpdateTransactionService';
import { DeleteTransactionService } from '../services/DeleteTransactionService';
import type { TransactionInput } from '@/server/shared/ports/transactions';

let mongo: MongoMemoryReplSet;
const user = new mongoose.Types.ObjectId().toString();
const other = new mongoose.Types.ObjectId().toString();
const repo = new TransactionRepository();
const wallets = new WalletRepository();
const categories = new CategoryRepository();
const uow = new MongoUnitOfWork();
const create = new CreateTransactionService(repo, wallets, categories, uow);
const update = new UpdateTransactionService(repo, wallets, categories, uow);
const remove = new DeleteTransactionService(repo, wallets, uow);
let input: TransactionInput;
beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([Wallet.init(), Transaction.init(), Category.init()]);
}, 60000);
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });
beforeEach(async () => {
  vi.restoreAllMocks();
  await Promise.all([Wallet.deleteMany({}), Transaction.collection.deleteMany({}), Category.deleteMany({}), User.deleteMany({})]);
  const wallet = await Wallet.create({ userId: user, name: 'Main' });
  input = { walletId: String(wallet._id), categoryId: null, type: 'expense', amount: 200, date: new Date('2026-08-25'), title: 'Test transaction' };
});
const balance = async (id = input.walletId) => (await Wallet.findById(id))!.balance;

describe('transaction services: migrated balance and reference rules', () => {
  it.each([['income', 200], ['expense', -200]] as const)('applies %s once', async (type, expected) => {
    await create.execute(user, { ...input, type }); expect(await balance()).toBe(expected);
  });
  it('accumulates multiple transactions', async () => {
    await create.execute(user, { ...input, type: 'income', amount: 3000 });
    await create.execute(user, { ...input, amount: 500 });
    await create.execute(user, { ...input, amount: 200 });
    expect(await balance()).toBe(2300);
  });
  it('updates amounts and reverses expense to income exactly once', async () => {
    const tx = await create.execute(user, input);
    await update.execute(tx.id, user, { ...input, amount: 150 });
    expect(await balance()).toBe(-150);
    await update.execute(tx.id, user, { ...input, type: 'income', amount: 100 });
    expect(await balance()).toBe(100);
    await update.execute(tx.id, user, { ...input, type: 'income', amount: 100, note: 'unchanged amount' });
    expect(await balance()).toBe(100);
  });
  it.each(['income', 'expense'] as const)('moves %s between wallets without double adjustment', async type => {
    const second = await Wallet.create({ userId: user, name: 'Second' });
    const tx = await create.execute(user, { ...input, type });
    await update.execute(tx.id, user, { ...input, type, walletId: String(second._id) });
    expect(await balance()).toBe(0);
    expect(second.id && await balance(String(second._id))).toBe(type === 'income' ? 200 : -200);
  });
  it.each(['income', 'expense'] as const)('reverses %s on delete', async type => {
    const tx = await create.execute(user, { ...input, type });
    await remove.execute(tx.id, user); expect(await balance()).toBe(0);
    expect(await Transaction.findById(tx.id)).toBeNull();
    await expect(remove.execute(tx.id, user)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await balance()).toBe(0);
  });
  it('isolates wallets and transaction mutations by owner', async () => {
    await expect(create.execute(other, input)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    const tx = await create.execute(user, input);
    await expect(update.execute(tx.id, other, input)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(remove.execute(tx.id, other)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await balance()).toBe(-200);
  });
  it('accepts null and matching categories of either type', async () => {
    const tx = await create.execute(user, input); expect(tx.categoryId).toBeNull();
    for (const type of ['income', 'expense'] as const) {
      const cat = await Category.create({ userId: user, name: type, type });
      const result = await create.execute(user, { ...input, type, categoryId: String(cat._id) });
      expect(result.categoryId).toBe(String(cat._id));
    }
  });
  it.each(['missing', 'foreign', 'mismatch-income', 'mismatch-expense'])('rejects %s category before writing', async variant => {
    let id = new mongoose.Types.ObjectId().toString();
    const type = variant === 'mismatch-expense' ? 'income' : 'expense';
    if (variant !== 'missing') {
      const cat = await Category.create({ userId: variant === 'foreign' ? other : user, name: 'Category', type: variant === 'mismatch-income' ? 'income' : 'expense' });
      id = String(cat._id);
    }
    await expect(create.execute(user, { ...input, type, categoryId: id })).rejects.toMatchObject({ code: 'VALIDATION_ERROR', fields: { categoryId: expect.any(String) } });
    expect(await Transaction.countDocuments()).toBe(0); expect(await balance()).toBe(0);
  });
  it('validates category compatibility again on update', async () => {
    const cat = await Category.create({ userId: user, name: 'Expense', type: 'expense' });
    const tx = await create.execute(user, { ...input, categoryId: String(cat._id) });
    await expect(update.execute(tx.id, user, { ...input, categoryId: String(cat._id), type: 'income' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await balance()).toBe(-200);
  });
  it.each(['create', 'update', 'delete'])('rolls back %s when balance write fails', async action => {
    const tx = action === 'create' ? null : await create.execute(user, input);
    vi.spyOn(wallets, 'adjust').mockRejectedValueOnce(new Error('Injected balance failure'));
    const operation = action === 'create' ? create.execute(user, input) : action === 'update' ? update.execute(tx!.id, user, { ...input, amount: 500 }) : remove.execute(tx!.id, user);
    await expect(operation).rejects.toThrow('Injected balance failure');
    expect(await balance()).toBe(tx ? -200 : 0);
    expect(await Transaction.countDocuments()).toBe(tx ? 1 : 0);
    if (tx) expect((await Transaction.findById(tx.id))!.amount).toBe(200);
  });
  it('handles concurrent creates and updates without drift', async () => {
    await Promise.all(Array.from({ length: 4 }, () => create.execute(user, { ...input, amount: 10 })));
    expect(await balance()).toBe(-40);
    const tx = await create.execute(user, input);
    await Promise.all([100, 300].map(amount => update.execute(tx.id, user, { ...input, amount })));
    const stored = await Transaction.findById(tx.id);
    expect(await balance()).toBe(-40 - stored!.amount);
  });
  it('rejects model writes even with a live UnitOfWork session', async () => {
    const tx = await create.execute(user, input);
    await uow.run(async context => {
      const session = context.session as mongoose.ClientSession;
      const doc = (await Transaction.findById(tx.id).session(session))!;
      const writes = [
        () => new Transaction({ ...input, userId: user }).save({ session }),
        () => Transaction.create([{ ...input, userId: user }], { session }),
        () => { doc.amount = 400; return doc.save({ session, validateBeforeSave: false }); },
        () => doc.deleteOne({ session }),
        () => Transaction.updateOne({ _id: tx.id }, { amount: 400 }, { session }),
        () => Transaction.updateMany({}, { amount: 400 }, { session }),
        () => Transaction.findOneAndUpdate({ _id: tx.id }, { amount: 400 }, { session }),
        () => Transaction.replaceOne({ _id: tx.id }, { ...input, userId: user }, { session }),
        () => Transaction.findOneAndReplace({ _id: tx.id }, { ...input, userId: user }, { session }),
        () => Transaction.deleteOne({ _id: tx.id }, { session }),
        () => Transaction.deleteMany({}, { session }),
        () => Transaction.findOneAndDelete({ _id: tx.id }, { session }),
        () => Transaction.insertMany([{ ...input, userId: user }], { session }),
        () => Transaction.bulkWrite([{ deleteMany: { filter: {} } }], { session }),
      ];
      for (const write of writes) await expect(write()).rejects.toThrow('TransactionRepository');
    });
    expect((await Transaction.findById(tx.id))!.amount).toBe(200);
    expect(await Transaction.countDocuments()).toBe(1);
    expect(await balance()).toBe(-200);
  });
  it('rejects raw saves without a session and repository writes without an active transaction', async () => {
    await expect(Transaction.create({ ...input, userId: user })).rejects.toThrow('TransactionRepository');
    await expect(repo.create(user, input, { session: undefined })).rejects.toThrow('active UnitOfWork');
    expect(await Transaction.countDocuments()).toBe(0);
  });
  it.each(['foreign-wallet', 'missing-category', 'foreign-category', 'wrong-type'])('repository rechecks %s on create and update', async variant => {
    const tx = await create.execute(user, input);
    const invalid = { ...input };
    if (variant === 'foreign-wallet') {
      invalid.walletId = String((await Wallet.create({ userId: other, name: 'Other' }))._id);
    } else if (variant === 'missing-category') {
      invalid.categoryId = new mongoose.Types.ObjectId().toString();
    } else {
      invalid.categoryId = String((await Category.create({ userId: variant === 'foreign-category' ? other : user, name: variant, type: variant === 'wrong-type' ? 'income' : 'expense' }))._id);
    }
    for (const write of [() => uow.run(c => repo.create(user, invalid, c)), () => uow.run(c => repo.update(tx.id, user, invalid, c))]) {
      await expect(write()).rejects.toMatchObject({ code: variant === 'foreign-wallet' ? 'NOT_FOUND' : 'VALIDATION_ERROR' });
    }
    expect(await Transaction.countDocuments()).toBe(1);
    expect((await Transaction.findById(tx.id))!.categoryId).toBeNull();
    expect(await balance()).toBe(-200);
  });
  it('persists note/date edits without changing balance', async () => {
    const tx = await create.execute(user, input);
    const updated = await update.execute(tx.id, user, { ...input, note: 'edited', date: new Date('2026-09-01') });
    expect(updated.note).toBe('edited');
    expect(updated.date.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(await balance()).toBe(-200);
  });
  it.each(['wallet', 'user'])('internal %s cascade propagates sessions and rolls back', async owner => {
    await User.create({ _id: user, email: `${owner}@example.com`, passwordHash: 'fixture', dataPrivacyConsent: true });
    const tx = await create.execute(user, input);
    const destroy = (session: mongoose.ClientSession) => owner === 'wallet'
      ? Wallet.findOneAndDelete({ _id: input.walletId }, { session }).exec()
      : User.findOneAndDelete({ _id: user }, { session }).exec();
    await expect(uow.run(async context => {
      const session = context.session as mongoose.ClientSession;
      await destroy(session);
      expect(await Transaction.findById(tx.id).session(session)).toBeNull();
      throw new Error('rollback cascade');
    })).rejects.toThrow('rollback cascade');
    expect(await Transaction.findById(tx.id)).not.toBeNull();
    expect(await balance()).toBe(-200);
    await uow.run<unknown>(context => destroy(context.session as mongoose.ClientSession));
    expect(await Transaction.findById(tx.id)).toBeNull();
    expect(await Wallet.findById(input.walletId)).toBeNull();
  });

});
