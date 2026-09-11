import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import '../Wallet';
import '../Category';
import '../Transaction';
import User from '../User';
import Category from '../Category';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('User cascade delete bug', () => {
  it('should cascade delete when query is not by _id', async () => {
    const user1 = await User.create({ email: 'u1@test.com', passwordHash: 'hash', dataPrivacyConsent: true });
    const user2 = await User.create({ email: 'u2@test.com', passwordHash: 'hash', dataPrivacyConsent: true });
    
    await Category.create({ userId: user1._id, name: 'C1', type: 'expense', icon: 'i' });
    await Category.create({ userId: user2._id, name: 'C2', type: 'expense', icon: 'i' });

    // delete u1 by email
    await User.findOneAndDelete({ email: 'u1@test.com' });

    const c1 = await Category.findOne({ userId: user1._id });
    const c2 = await Category.findOne({ userId: user2._id });

    expect(c1).toBeNull(); // Should be deleted
    expect(c2).not.toBeNull(); // Should NOT be deleted
  });
});
