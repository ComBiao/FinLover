// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import Category from '@/server/db/models/Category';
import User from '@/server/db/models/User';
import { signToken } from '@/server/shared/auth/crypto';
import { seedUser } from '@/test/user-fixture';
import { DEFAULT_CATEGORIES } from '@/server/modules/auth/default-categories';
import { GET as listCategoriesRoute } from '@/app/api/v1/categories/route';
import { GET as meRoute } from '@/app/api/v1/auth/me/route';

vi.mock('server-only', () => ({}));
vi.mock('@/server/db/index', () => ({ connectDB: vi.fn(async () => {}) }));

const userId = new mongoose.Types.ObjectId().toString();
const otherUserId = new mongoose.Types.ObjectId().toString();
const token = signToken({ userId });
const get = (path: string, authorization: string | null = `Bearer ${token}`) =>
  new NextRequest(`http://localhost:3000${path}`, { method: 'GET', headers: authorization ? { authorization } : undefined });

let mongo: MongoMemoryReplSet;

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Category.init();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

beforeEach(async () => {
  await Category.deleteMany({});
  await User.deleteMany({});
  await seedUser(userId);
});

describe('GET /api/v1/categories', () => {
  it('requires authentication', async () => {
    const response = await listCategoriesRoute(get('/api/v1/categories', null));
    expect(response.status).toBe(401);
  });

  it('returns only the caller\'s categories without exposing userId', async () => {
    await Category.create([
      { userId, name: 'Food', type: 'expense', color: '#FF8800', icon: 'Utensils', isSystem: false },
      { userId, name: 'Salary', type: 'income', isSystem: true },
      { userId: otherUserId, name: 'Secret', type: 'expense', isSystem: false },
    ]);

    const response = await listCategoriesRoute(get('/api/v1/categories'));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.status).toBe(true);
    expect(payload.data.map((c: { name: string }) => c.name)).toEqual(['Food', 'Salary']);
    expect(payload.data[0]).toMatchObject({ name: 'Food', type: 'expense', color: '#FF8800', icon: 'Utensils', isSystem: false });
    expect(payload.data[0].id).toMatch(/^[a-f0-9]{24}$/);
    for (const category of payload.data) expect(category).not.toHaveProperty('userId');
  });

  it('filters by type', async () => {
    await Category.create([
      { userId, name: 'Food', type: 'expense', isSystem: false },
      { userId, name: 'Salary', type: 'income', isSystem: false },
    ]);

    const expense = await (await listCategoriesRoute(get('/api/v1/categories?type=expense'))).json();
    const income = await (await listCategoriesRoute(get('/api/v1/categories?type=income'))).json();

    expect(expense.data.map((c: { name: string }) => c.name)).toEqual(['Food']);
    expect(income.data.map((c: { name: string }) => c.name)).toEqual(['Salary']);
  });

  it('rejects an unknown type', async () => {
    const response = await listCategoriesRoute(get('/api/v1/categories?type=transfer'));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns the seeded system defaults, including an "Others" fallback per type', async () => {
    await Category.insertMany(DEFAULT_CATEGORIES.map((category) => ({ ...category, userId, isSystem: true })));

    const { data } = await (await listCategoriesRoute(get('/api/v1/categories'))).json();

    expect(data).toHaveLength(DEFAULT_CATEGORIES.length);
    for (const type of ['expense', 'income']) {
      expect(data.some((c: { type: string; name: string }) => c.type === type && c.name === 'Others')).toBe(true);
    }
  });
});

describe('GET /api/v1/auth/me', () => {
  it('requires authentication', async () => {
    expect((await meRoute(get('/api/v1/auth/me', null))).status).toBe(401);
  });

  it('returns id, email and name without the password hash', async () => {
    await User.updateOne({ _id: userId }, { name: 'Alex Tester' });

    const response = await meRoute(get('/api/v1/auth/me'));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual({ status: true, data: { user: { id: userId, email: `${userId}@example.com`, name: 'Alex Tester' } } });
  });

  it('omits name for accounts created before names were stored', async () => {
    const payload = await (await meRoute(get('/api/v1/auth/me'))).json();
    expect(payload.data.user).toEqual({ id: userId, email: `${userId}@example.com` });
  });

  it('rejects a token for a deleted account', async () => {
    await User.deleteMany({});
    expect((await meRoute(get('/api/v1/auth/me'))).status).toBe(401);
  });
});
