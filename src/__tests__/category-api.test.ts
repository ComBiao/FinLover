// @vitest-environment node
/**
 * Integration tests for the Category API endpoints.
 *
 * POST   /api/categories        → src/app/api/categories/route.ts
 * PUT    /api/categories/[id]   → src/app/api/categories/[id]/route.ts
 * DELETE /api/categories/[id]   → src/app/api/categories/[id]/route.ts
 *
 * Uses MongoMemoryReplSet (not MongoMemoryServer) because
 * deleteCategoryAndCascade relies on MongoDB sessions/transactions
 * which require a replica set.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import Category from '@/models/Category';
import Transaction from '@/models/Transaction';
import { signToken } from '@/lib/auth';

// ---------------------------------------------------------------------------
// We need to bypass the cached connectDB singleton so our handlers talk to
// the in-memory replica set that we spin up here.  We mock `@/lib/db` to
// make `connectDB` a no-op — the connection is already established by the
// time a handler calls it.
// ---------------------------------------------------------------------------
vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  default: vi.fn().mockResolvedValue(undefined),
}));

// Lazy-import the route handlers AFTER the mock is in place so that their
// top-level `import connectDB from '@/lib/db'` picks up the mock.
let POST: typeof import('@/app/api/categories/route').POST;
let PUT: typeof import('@/app/api/categories/[id]/route').PUT;
let DELETE: typeof import('@/app/api/categories/[id]/route').DELETE;

// ---------------------------------------------------------------------------
// Deterministic ObjectIds for the "current" and "other" user.
// ---------------------------------------------------------------------------
const MOCK_USER_ID = new mongoose.Types.ObjectId();
const OTHER_USER_ID = new mongoose.Types.ObjectId();

const VALID_TOKEN = signToken({ userId: MOCK_USER_ID.toString() });

// ---------------------------------------------------------------------------
// Test lifecycle
// ---------------------------------------------------------------------------
let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  const uri = replSet.getUri();

  await mongoose.connect(uri);

  // Ensure indexes are built before any test runs.
  await Category.init();
  await Transaction.init();

  // Dynamic import of route handlers after DB is ready.
  const postModule = await import('@/app/api/categories/route');
  POST = postModule.POST;

  const idModule = await import('@/app/api/categories/[id]/route');
  PUT = idModule.PUT;
  DELETE = idModule.DELETE;
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
}, 60_000);

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a NextRequest with the standard auth header. */
function createRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
  token: string = VALID_TOKEN
): NextRequest {
  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as any);
}

/** Shorthand to seed a category directly in the DB. */
async function seedCategory(
  overrides: Partial<{
    userId: mongoose.Types.ObjectId;
    name: string;
    type: 'income' | 'expense';
    color: string;
    isSystem: boolean;
  }> = {},
) {
  return Category.create({
    userId: MOCK_USER_ID,
    name: 'Groceries',
    type: 'expense',
    ...overrides,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

// ===========================================================================
// POST /api/categories
// ===========================================================================
describe('POST /api/categories', () => {
  // --- Happy path ---
  it('should create a new category and return 201', async () => {
    const req = createRequest('POST', '/api/categories', {
      name: 'Salary',
      type: 'income',
      color: '#00FF00',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data).toBeDefined();
    expect(json.data.name).toBe('Salary');
    expect(json.data.type).toBe('income');
    expect(json.data.color).toBe('#00FF00');
    expect(json.data.isSystem).toBe(false);
    expect(json.data.userId).toBeDefined();
  });

  it('should create a category without optional color field', async () => {
    const req = createRequest('POST', '/api/categories', {
      name: 'Transport',
      type: 'expense',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.name).toBe('Transport');
    expect(json.data.type).toBe('expense');
  });

  // --- Validation errors (400) ---
  it('should return 400 when name is missing', async () => {
    const req = createRequest('POST', '/api/categories', {
      type: 'expense',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.fields).toHaveProperty('name');
  });

  it('should return 400 when type is missing', async () => {
    const req = createRequest('POST', '/api/categories', {
      name: 'Food',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.fields).toHaveProperty('type');
  });

  it('should return 400 when type is an invalid enum value', async () => {
    const req = createRequest('POST', '/api/categories', {
      name: 'Gambling',
      type: 'transfer',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.fields).toHaveProperty('type');
  });

  it('should return 400 when name exceeds 50 characters', async () => {
    const req = createRequest('POST', '/api/categories', {
      name: 'a'.repeat(51),
      type: 'expense',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.fields).toHaveProperty('name');
  });

  // --- Conflict (409) ---
  it('should return 409 when creating a duplicate name for the same user', async () => {
    await seedCategory({ name: 'Food', type: 'expense' });

    const req = createRequest('POST', '/api/categories', {
      name: 'Food',
      type: 'expense',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.code).toBe('CONFLICT');
  });

  it('should allow the same name for different users (no false 409)', async () => {
    await seedCategory({ userId: OTHER_USER_ID, name: 'Food', type: 'expense' });

    const req = createRequest('POST', '/api/categories', {
      name: 'Food',
      type: 'expense',
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  // --- Unauthorized (401) ---
  it('should return 401 when Authorization header is missing', async () => {
    const req = createRequest(
      'POST',
      '/api/categories',
      { name: 'Test', type: 'income' },
      { Authorization: '' },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 when Authorization header does not start with Bearer', async () => {
    const req = createRequest(
      'POST',
      '/api/categories',
      { name: 'Test', type: 'income' },
      { Authorization: 'Basic abc123' },
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 when JWT has an invalid signature', async () => {
    // Generate a valid token but tamper with the signature (last character)
    const tamperedToken = VALID_TOKEN.slice(0, -1) + (VALID_TOKEN.endsWith('a') ? 'b' : 'a');
    const req = createRequest(
      'POST',
      '/api/categories',
      { name: 'Test', type: 'income' },
      {},
      tamperedToken
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });
});

// ===========================================================================
// PUT /api/categories/[id]
// ===========================================================================
describe('PUT /api/categories/[id]', () => {
  // --- Happy path ---
  it('should update a category name and return 200', async () => {
    const cat = await seedCategory({ name: 'Old Name', type: 'expense' });

    const req = createRequest('PUT', `/api/categories/${cat._id}`, {
      name: 'New Name',
    });
    const res = await PUT(req, { params: Promise.resolve({ id: cat._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.name).toBe('New Name');
  });

  it('should update a category color and return 200', async () => {
    const cat = await seedCategory({ name: 'Food', color: '#FF0000' });

    const req = createRequest('PUT', `/api/categories/${cat._id}`, {
      color: '#00FF00',
    });
    const res = await PUT(req, { params: Promise.resolve({ id: cat._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.color).toBe('#00FF00');
  });

  it('should update a category type and return 200', async () => {
    const cat = await seedCategory({ name: 'Misc', type: 'expense' });

    const req = createRequest('PUT', `/api/categories/${cat._id}`, {
      type: 'income',
    });
    const res = await PUT(req, { params: Promise.resolve({ id: cat._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.type).toBe('income');
  });

  it('should update multiple fields at once', async () => {
    const cat = await seedCategory({ name: 'OldCat', type: 'expense', color: '#000' });

    const req = createRequest('PUT', `/api/categories/${cat._id}`, {
      name: 'NewCat',
      type: 'income',
      color: '#FFF',
    });
    const res = await PUT(req, { params: Promise.resolve({ id: cat._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.name).toBe('NewCat');
    expect(json.data.type).toBe('income');
    expect(json.data.color).toBe('#FFF');
  });

  it.each(['', '   ', '\t\n'])('rejects blank name %j without saving changes', async (name) => {
    const cat = await seedCategory();
    const res = await PUT(createRequest('PUT', `/api/categories/${cat._id}`, { name }), {
      params: Promise.resolve({ id: cat._id.toString() }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error.fields).toHaveProperty('name');
    expect((await Category.findById(cat._id))!.name).toBe('Groceries');
  });

  // --- Validation errors (400) ---
  it('should return 400 when type is an invalid enum value', async () => {
    const cat = await seedCategory({ name: 'Food' });

    const req = createRequest('PUT', `/api/categories/${cat._id}`, {
      type: 'transfer',
    });
    const res = await PUT(req, { params: Promise.resolve({ id: cat._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.fields).toHaveProperty('type');
  });

  it('should return 400 when name exceeds 50 characters on update', async () => {
    const cat = await seedCategory({ name: 'Food' });

    const req = createRequest('PUT', `/api/categories/${cat._id}`, {
      name: 'a'.repeat(51),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: cat._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.fields).toHaveProperty('name');
  });

  it('should return 400 when id param is not a valid ObjectId', async () => {
    const req = createRequest('PUT', '/api/categories/not-a-valid-id', {
      name: 'Something',
    });
    const res = await PUT(req, { params: Promise.resolve({ id: 'not-a-valid-id' }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  // --- Conflict (409) ---
  it('should return 409 when renaming to a name that already exists for the same user', async () => {
    await seedCategory({ name: 'Existing', type: 'expense' });
    const cat = await seedCategory({ name: 'ToRename', type: 'expense' });

    const req = createRequest('PUT', `/api/categories/${cat._id}`, {
      name: 'Existing',
    });
    const res = await PUT(req, { params: Promise.resolve({ id: cat._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.code).toBe('CONFLICT');
  });

  // --- Forbidden (403) — system category ---
  it('should return 403 when trying to update a system category', async () => {
    const systemCat = await seedCategory({
      name: 'System Default',
      type: 'expense',
      isSystem: true,
    });

    const req = createRequest('PUT', `/api/categories/${systemCat._id}`, {
      name: 'Hacked',
    });
    const res = await PUT(req, { params: Promise.resolve({ id: systemCat._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe('FORBIDDEN');
  });

  // --- Not Found (404) ---
  it('should return 404 when category does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const req = createRequest('PUT', `/api/categories/${fakeId}`, {
      name: 'Ghost',
    });
    const res = await PUT(req, { params: Promise.resolve({ id: fakeId.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('should return 404 when trying to update another user\'s category', async () => {
    const otherCat = await seedCategory({
      userId: OTHER_USER_ID,
      name: 'Not Mine',
      type: 'income',
    });

    const req = createRequest('PUT', `/api/categories/${otherCat._id}`, {
      name: 'Stolen',
    });
    const res = await PUT(req, { params: Promise.resolve({ id: otherCat._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  // --- Unauthorized (401) ---
  it('should return 401 without a valid Bearer token', async () => {
    const cat = await seedCategory();

    const req = createRequest(
      'PUT',
      `/api/categories/${cat._id}`,
      { name: 'X' },
      { Authorization: '' },
    );
    const res = await PUT(req, { params: Promise.resolve({ id: cat._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });
});

// ===========================================================================
// DELETE /api/categories/[id]
// ===========================================================================
describe('DELETE /api/categories/[id]', () => {
  // --- Happy path ---
  it('should delete a category and return 200', async () => {
    const cat = await seedCategory({ name: 'ToDelete', type: 'expense' });

    const req = createRequest('DELETE', `/api/categories/${cat._id}`);
    const res = await DELETE(req, { params: Promise.resolve({ id: cat._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toBeDefined();
    expect(json.data._id).toBe(cat._id.toString());

    // Verify the category is actually gone.
    const found = await Category.findById(cat._id);
    expect(found).toBeNull();
  });

  it('should nullify categoryId on related transactions after deletion', async () => {
    const cat = await seedCategory({ name: 'CascadeMe', type: 'expense' });
    const walletId = new mongoose.Types.ObjectId();

    // Create a transaction linked to this category.
    await Transaction.create({
      userId: MOCK_USER_ID,
      walletId,
      categoryId: cat._id,
      type: 'expense',
      amount: 42,
      date: new Date(),
    });

    const req = createRequest('DELETE', `/api/categories/${cat._id}`);
    const res = await DELETE(req, { params: Promise.resolve({ id: cat._id.toString() }) });

    expect(res.status).toBe(200);

    // The transaction's categoryId should now be null.
    const tx = await Transaction.findOne({ userId: MOCK_USER_ID });
    expect(tx).not.toBeNull();
    expect(tx!.categoryId).toBeNull();
  });

  it('rolls back the category and transaction references when commit fails', async () => {
    const cat = await seedCategory();
    const tx = await Transaction.create({
      userId: MOCK_USER_ID,
      walletId: new mongoose.Types.ObjectId(),
      categoryId: cat._id,
      type: 'expense',
      amount: 42,
      date: new Date(),
    });
    const session = await mongoose.startSession();
    const start = vi.spyOn(mongoose, 'startSession').mockResolvedValueOnce(session);
    const commit = vi.spyOn(session, 'commitTransaction').mockImplementationOnce(async () => {
      // Both writes really happened inside the transaction before the injected failure.
      expect(await Category.findById(cat._id).session(session)).toBeNull();
      expect((await Transaction.findById(tx._id).session(session))!.categoryId).toBeNull();
      throw new Error('Injected commit failure');
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = await DELETE(createRequest('DELETE', `/api/categories/${cat._id}`), {
        params: Promise.resolve({ id: cat._id.toString() }),
      });
      expect(res.status).toBe(500);
      expect(commit).toHaveBeenCalledOnce();
      expect(await Category.findById(cat._id)).not.toBeNull();
      expect((await Transaction.findById(tx._id))!.categoryId!.toString()).toBe(cat._id.toString());
    } finally {
      start.mockRestore();
      commit.mockRestore();
      log.mockRestore();
      await session.endSession();
    }
  });

  // --- Forbidden (403) — system category ---
  it('should return 403 when trying to delete a system category', async () => {
    const systemCat = await seedCategory({
      name: 'System Immutable',
      type: 'income',
      isSystem: true,
    });

    const req = createRequest('DELETE', `/api/categories/${systemCat._id}`);
    const res = await DELETE(req, { params: Promise.resolve({ id: systemCat._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe('FORBIDDEN');

    // Verify it was NOT deleted.
    const found = await Category.findById(systemCat._id);
    expect(found).not.toBeNull();
  });

  // --- Not Found (404) ---
  it('should return 404 when category does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const req = createRequest('DELETE', `/api/categories/${fakeId}`);
    const res = await DELETE(req, { params: Promise.resolve({ id: fakeId.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('should return 404 when trying to delete another user\'s category', async () => {
    const otherCat = await seedCategory({
      userId: OTHER_USER_ID,
      name: 'Other User Cat',
      type: 'expense',
    });

    const req = createRequest('DELETE', `/api/categories/${otherCat._id}`);
    const res = await DELETE(req, { params: Promise.resolve({ id: otherCat._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe('NOT_FOUND');

    // Verify it was NOT deleted.
    const found = await Category.findById(otherCat._id);
    expect(found).not.toBeNull();
  });

  // --- Validation (400) ---
  it('should return 400 when id param is not a valid ObjectId', async () => {
    const req = createRequest('DELETE', '/api/categories/bad-id');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'bad-id' }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  // --- Unauthorized (401) ---
  it('should return 401 without a valid Bearer token', async () => {
    const cat = await seedCategory();

    const req = createRequest(
      'DELETE',
      `/api/categories/${cat._id}`,
      undefined,
      { Authorization: '' },
    );
    const res = await DELETE(req, { params: Promise.resolve({ id: cat._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });
});

