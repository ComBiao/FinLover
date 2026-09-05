import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcrypt';
import User from '../User';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  // ensure indexes (unique email) are built before tests rely on them
  await User.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

async function makeUser(overrides: Partial<{ email: string; passwordHash: string; dataPrivacyConsent: boolean }> = {}) {
  return User.create({
    email: 'user@example.com',
    passwordHash: await bcrypt.hash('password123', 10),
    dataPrivacyConsent: true,
    ...overrides,
  });
}

describe('User model', () => {
  it('saves successfully with a well-formed unique email, hashed password, and consent true', async () => {
    const user = await makeUser();
    expect(user._id).toBeDefined();
    expect(user.email).toBe('user@example.com');
    expect(await bcrypt.compare('password123', user.passwordHash)).toBe(true);
    expect(user.dataPrivacyConsent).toBe(true);
  });

  it('rejects dataPrivacyConsent: false with a validation error and persists nothing', async () => {
    await expect(makeUser({ dataPrivacyConsent: false })).rejects.toThrow(mongoose.Error.ValidationError);
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects a duplicate email case-insensitively via the unique index', async () => {
    await makeUser({ email: 'User@Example.com' });

    await expect(makeUser({ email: 'user@example.com' })).rejects.toMatchObject({
      code: 11000,
    });
    expect(await User.countDocuments()).toBe(1);
  });

  it('rejects a user missing passwordHash', async () => {
    await expect(
      User.create({
        email: 'nopass@example.com',
        dataPrivacyConsent: true,
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('auto-populates createdAt/updatedAt and keeps createdAt stable on update', async () => {
    const user = await makeUser({ email: 'timestamps@example.com' });
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);

    const originalCreatedAt = user.createdAt.getTime();

    await new Promise((resolve) => setTimeout(resolve, 10));
    user.passwordHash = await bcrypt.hash('newpassword', 10);
    await user.save();

    expect(user.createdAt.getTime()).toBe(originalCreatedAt);
    expect(user.updatedAt.getTime()).toBeGreaterThan(originalCreatedAt);
  });

  describe('cascade-delete pre-hook', () => {
    it('throws if Wallet/Category/Transaction models are not registered', async () => {
      const user = await makeUser({ email: 'cascade@example.com' });
      // In this isolated test file, only User is imported/registered — the
      // hook looks up the other models by string name via mongoose.model(),
      // which throws MissingSchemaError when they haven't been registered.
      await expect(User.findOneAndDelete({ _id: user._id })).rejects.toThrow(
        /Schema hasn't been registered/
      );
    });

    it('deletes related Wallet/Category/Transaction documents when those models are registered', async () => {
      // Register minimal versions of the related models so the hook can resolve them.
      const WalletSchema = new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId });
      const CategorySchema = new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId });
      const TransactionSchema = new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId });
      const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
      const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
      const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);

      const user = await makeUser({ email: 'cascade2@example.com' });
      await Wallet.create({ userId: user._id });
      await Category.create({ userId: user._id });
      await Transaction.create({ userId: user._id });

      await User.findOneAndDelete({ _id: user._id });

      expect(await Wallet.countDocuments({ userId: user._id })).toBe(0);
      expect(await Category.countDocuments({ userId: user._id })).toBe(0);
      expect(await Transaction.countDocuments({ userId: user._id })).toBe(0);
    });
  });
});
