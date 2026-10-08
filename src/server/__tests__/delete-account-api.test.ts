// @vitest-environment node
/**
 * Real-database proof that DELETE /api/v1/auth/delete-account cascades.
 * Uses MongoMemoryReplSet because MongoUnitOfWork needs a replica set.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { NextRequest } from "next/server";
import User from "@/server/db/models/User";
import Wallet from "@/server/db/models/Wallet";
import Category from "@/server/db/models/Category";
import Transaction from "@/server/db/models/Transaction";
import { signToken } from "@/server/shared/auth/crypto";
import { seedTransaction } from "@/test/transaction-fixture";
import jwt from "jsonwebtoken";

let createCategory: typeof import("@/app/api/categories/route").POST;

vi.mock("server-only", () => ({}));

// Make connectDB a no-op: the connection is opened in beforeAll instead.
vi.mock("@/server/db/index", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  default: vi.fn().mockResolvedValue(undefined),
}));

// clearSessionCookie() calls next/headers' cookies(), which only works inside
// a live Next.js request. vi.hoisted lets the mock factory and the tests share
// the same store object, so tests can check whether the cookie was cleared.
const cookieStore = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(cookieStore),
}));

let DELETE: typeof import("@/app/api/v1/auth/delete-account/route").DELETE;

const USER_ID = new mongoose.Types.ObjectId();
const OTHER_USER_ID = new mongoose.Types.ObjectId();
const TOKEN = signToken({ userId: USER_ID.toString() });

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri());
  await User.init();
  await Category.init();
  await Transaction.init();
  ({ DELETE } = await import("@/app/api/v1/auth/delete-account/route"));
  ({ POST: createCategory } = await import("@/app/api/categories/route"));
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
}, 60_000);

beforeEach(async () => {
  vi.stubEnv("PUBLIC_ORIGINS", "http://localhost:3000");
  for (const collection of Object.values(mongoose.connection.collections)) {
    await collection.deleteMany({});
  }
  cookieStore.set.mockClear();
  cookieStore.delete.mockClear();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Bearer auth means no Origin header is needed (the CSRF check is cookie-only). */
function deleteRequest(
  token: string | null = TOKEN,
  via: "cookie" | "bearer" = "cookie",
) {
  const headers: Record<string, string> = {};
  if (token && via === "cookie") {
    headers.cookie = `session_token=${token}`;
    headers.origin = "http://localhost:3000";
  } else if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return new NextRequest("http://localhost:3000/api/v1/auth/delete-account", {
    method: "DELETE",
    headers,
  });
}

const cookieWasCleared = () =>
  cookieStore.set.mock.calls.length + cookieStore.delete.mock.calls.length > 0;

/** One user with 2 wallets, 2 categories and 3 transactions. */
async function seedUserWithData(
  userId: mongoose.Types.ObjectId,
  email: string,
) {
  await User.create({
    _id: userId,
    email,
    passwordHash: "not-a-real-hash",
    dataPrivacyConsent: true,
  });
  const wallets = await Wallet.create([
    { userId, name: "Cash" },
    { userId, name: "Bank" },
  ]);
  const categories = await Category.create([
    { userId, name: "Food", type: "expense" },
    { userId, name: "Salary", type: "income" },
  ]);
  const amounts = [10, 20, 30];
  for (const [i, amount] of amounts.entries()) {
    await seedTransaction(
      new Transaction({
        userId,
        walletId: wallets[i % 2]._id,
        categoryId: categories[0]._id,
        type: "expense",
        title: `Tx ${i}`,
        amount,
        date: new Date(),
      }),
    );
  }
}

/** How many documents each collection holds for this user. */
async function countsFor(userId: mongoose.Types.ObjectId) {
  return {
    users: await User.countDocuments({ _id: userId }),
    wallets: await Wallet.countDocuments({ userId }),
    categories: await Category.countDocuments({ userId }),
    transactions: await Transaction.countDocuments({ userId }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("DELETE /api/v1/auth/delete-account (real database)", () => {
  it("deletes the user and cascades to wallets, categories and transactions", async () => {
    await seedUserWithData(USER_ID, "me@example.com");
    expect(await countsFor(USER_ID)).toEqual({
      users: 1,
      wallets: 2,
      categories: 2,
      transactions: 3,
    });

    const res = await DELETE(deleteRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ status: true, data: { success: true } });
    expect(await countsFor(USER_ID)).toEqual({
      users: 0,
      wallets: 0,
      categories: 0,
      transactions: 0,
    });
    expect(cookieWasCleared()).toBe(true);
  });

  it("leaves another user's data untouched", async () => {
    await seedUserWithData(USER_ID, "me@example.com");
    await seedUserWithData(OTHER_USER_ID, "other@example.com");

    const res = await DELETE(deleteRequest());

    expect(res.status).toBe(200);
    expect(await countsFor(OTHER_USER_ID)).toEqual({
      users: 1,
      wallets: 2,
      categories: 2,
      transactions: 3,
    });
  });

  it("allows re-registering the same email after a hard delete", async () => {
    await seedUserWithData(USER_ID, "me@example.com");
    await DELETE(deleteRequest());

    await expect(
      User.create({
        email: "me@example.com",
        passwordHash: "x",
        dataPrivacyConsent: true,
      }),
    ).resolves.toBeDefined();
  });

  it("rolls back everything when the commit fails", async () => {
    await seedUserWithData(USER_ID, "me@example.com");
    const session = await mongoose.startSession();
    const start = vi
      .spyOn(mongoose, "startSession")
      .mockResolvedValueOnce(session);
    const commit = vi
      .spyOn(session, "commitTransaction")
      .mockImplementationOnce(async () => {
        // By now the cascade has really run inside the transaction...
        expect(
          await User.countDocuments({ _id: USER_ID }).session(session),
        ).toBe(0);
        expect(
          await Transaction.countDocuments({ userId: USER_ID }).session(
            session,
          ),
        ).toBe(0);
        // ...then we make the commit fail.
        throw new Error("Injected commit failure");
      });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await DELETE(deleteRequest());

      expect(res.status).toBe(500);
      expect(commit).toHaveBeenCalledOnce();
      expect(await countsFor(USER_ID)).toEqual({
        users: 1,
        wallets: 2,
        categories: 2,
        transactions: 3,
      });
      // The account still exists, so the user must stay logged in to retry.
      expect(cookieWasCleared()).toBe(false);
    } finally {
      start.mockRestore();
      commit.mockRestore();
      log.mockRestore();
      await session.endSession();
    }
  });

  it("returns 404 and clears the cookie for a valid token whose user is gone", async () => {
    const res = await DELETE(deleteRequest());
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.status).toBe(false);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(cookieWasCleared()).toBe(true);
  });

  it("returns 401 for an expired token and deletes nothing", async () => {
    await seedUserWithData(USER_ID, "me@example.com");
    const expired = jwt.sign(
      { userId: USER_ID.toString() },
      process.env.JWT_SECRET as string,
      { expiresIn: "-1s" },
    );

    const res = await DELETE(deleteRequest(expired));

    expect(res.status).toBe(401);
    expect(await countsFor(USER_ID)).toEqual({
      users: 1,
      wallets: 2,
      categories: 2,
      transactions: 3,
    });
  });

  it("rejects Bearer auth with 401, deletes nothing and keeps the cookie", async () => {
    await seedUserWithData(USER_ID, "me@example.com");
    const res = await DELETE(deleteRequest(TOKEN, "bearer"));
    expect(res.status).toBe(401);
    expect(await countsFor(USER_ID)).toEqual({
      users: 1,
      wallets: 2,
      categories: 2,
      transactions: 3,
    });
    expect(cookieWasCleared()).toBe(false);
  });
  it("rejects another device's token after the account is deleted", async () => {
    await seedUserWithData(USER_ID, "me@example.com");
    const otherDevice = signToken({ userId: USER_ID.toString() }); // issued before the delete

    expect((await DELETE(deleteRequest())).status).toBe(200);

    const res = await createCategory(
      new NextRequest("http://localhost:3000/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${otherDevice}`,
        },
        body: JSON.stringify({ name: "Ghost", type: "expense" }),
      }),
    );
    expect(res.status).toBe(401);
    expect(await Category.countDocuments({ userId: USER_ID })).toBe(0);
  });
});
