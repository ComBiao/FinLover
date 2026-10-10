import { seedTransaction } from "@/test/transaction-fixture";
import { seedUser } from "@/test/user-fixture";
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { buildSpec } from "@/server/shared/docs/openapi";
import { signToken } from "@/server/shared/auth/crypto";
import Wallet from "@/server/db/models/Wallet";
import Category from "@/server/db/models/Category";
import Transaction from "@/server/db/models/Transaction";
import User from "@/server/db/models/User";
vi.mock("@/server/db/index", () => ({ connectDB: vi.fn(async () => {}) }));
const cookieStore = vi.hoisted(() => ({ set: vi.fn(), delete: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => cookieStore) }));
import { auth, categories, transactions } from "@/server/composition";
import { v1 } from "@/server/shared/http/versioned-handlers";
const ajv = new Ajv({ strict: false });
addFormats(ajv);
const user = new mongoose.Types.ObjectId().toString();
const other = new mongoose.Types.ObjectId().toString();
const token = signToken({ userId: user });
const otherToken = signToken({ userId: other });
let mongo: MongoMemoryReplSet;
let wallet: string;
beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([
    Wallet.init(),
    Category.init(),
    Transaction.init(),
    User.init(),
  ]);
}, 60000);
afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv("PUBLIC_ORIGINS", "http://localhost:3000");
  await Promise.all([
    Wallet.deleteMany({}),
    Category.deleteMany({}),
    Transaction.collection.deleteMany({}),
    User.deleteMany({}),
  ]);
  await Promise.all([seedUser(user), seedUser(other)]);
  wallet = String((await Wallet.create({ userId: user, name: "Main" }))._id);
});
function request(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = { authorization: `Bearer ${token}` },
) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(path.includes("/auth/") ? { origin: "http://localhost:3000" } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const context = (id = "") => ({ params: Promise.resolve({ id }) });
async function contract(
  version: "legacy" | "v1",
  path: string,
  method: string,
  response: Response,
) {
  const spec = buildSpec(version);
  const operation = spec.paths[path]?.[method] as {
    responses: Record<
      string,
      { content?: { "application/json": { schema: object } } }
    >;
  };
  const documented = operation.responses[response.status];
  expect(documented).toBeDefined();
  if (response.status === 204) {
    expect(await response.text()).toBe("");
    return null;
  }
  const payload = await response.json();
  const validate = ajv.compile(documented.content!["application/json"].schema);
  expect(validate(payload), JSON.stringify(validate.errors)).toBe(true);
  return payload;
}
describe.each(["legacy", "v1"] as const)("%s API contracts", (version) => {
  it("register/login/logout match schemas and cookie behavior", async () => {
    const prefix = version === "v1" ? "/api/v1" : "/api";
    const register = version === "v1" ? v1.register : auth.register;
    const login = version === "v1" ? v1.login : auth.login;
    const body = {
      email: "test@example.com",
      password: "Password1",
      confirmPassword: "Password1",
      dataPrivacyConsent: true,
    };
    const reg = await register(
      request("POST", `${prefix}/auth/register`, body, {}),
      context(),
    );
    expect(reg.status).toBe(201);
    await contract(version, `${prefix}/auth/register`, "post", reg);
    const duplicate = await register(
      request("POST", `${prefix}/auth/register`, body, {}),
      context(),
    );
    expect(duplicate.status).toBe(409);
    await contract(version, `${prefix}/auth/register`, "post", duplicate);
    const res = await login(
      request("POST", `${prefix}/auth/login`, body, {}),
      context(),
    );
    expect(res.status).toBe(200);
    await contract(version, `${prefix}/auth/login`, "post", res);
    expect(cookieStore.set).toHaveBeenCalledWith(
      "session_token",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
    const bad = await login(
      request(
        "POST",
        `${prefix}/auth/login`,
        { ...body, password: "wrong" },
        {},
      ),
      context(),
    );
    expect(bad.status).toBe(401);
    await contract(version, `${prefix}/auth/login`, "post", bad);
    const out =
      version === "v1"
        ? await v1.logout(
            request("POST", `${prefix}/auth/logout`, undefined, {}),
            context(),
          )
        : await auth.logout(request("POST", "/api/auth/logout", undefined, {}));
    await contract(version, `${prefix}/auth/logout`, "post", out);
    expect(cookieStore.delete).toHaveBeenCalledWith("session_token");
  });
  it("category and transaction CRUD match schemas and preserve cascade balances", async () => {
    const prefix = version === "v1" ? "/api/v1" : "/api";
    const catPath = `${prefix}/categories`;
    const txPath = `${prefix}/${version === "v1" ? "transactions" : "transaction"}`;
    const c =
      version === "v1"
        ? {
            create: v1.createCategory,
            update: v1.updateCategory,
            remove: v1.deleteCategory,
          }
        : categories;
    const t =
      version === "v1"
        ? {
            create: v1.createTransaction,
            update: v1.updateTransaction,
            remove: v1.deleteTransaction,
          }
        : transactions;
    const cat = await contract(
      version,
      catPath,
      "post",
      await c.create(
        request("POST", catPath, { name: "Food", type: "expense" }),
        context(),
      ),
    );
    const id = String(cat.data.id ?? cat.data._id);
    await contract(
      version,
      `${catPath}/{id}`,
      "put",
      await c.update(
        request("PUT", `${catPath}/${id}`, { name: "Groceries" }),
        context(id),
      ),
    );
    const body =
      version === "v1"
        ? {
            walletId: wallet,
            categoryId: id,
            type: "expense",
            amount: 42,
            date: "2026-09-01",
            title: "Groceries run",
          }
        : {
            wallet_id: wallet,
            category_id: id,
            type: "Expense",
            amount: 42,
            date: "2026-09-01",
            title: "Groceries run",
          };
    const createdResponse = await t.create(
      request("POST", txPath, body),
      context(),
    );
    expect(createdResponse.status).toBe(201);
    const tx = await contract(version, txPath, "post", createdResponse);
    if (version === "v1") {
      expect(tx.data).toEqual({
        id: expect.any(String),
        walletId: wallet,
        categoryId: id,
        type: "expense",
        amount: 42,
        date: "2026-09-01",
        title: "Groceries run",
      });
      expect(tx.data).not.toHaveProperty("wallet_id");
    }
    await contract(
      version,
      `${txPath}/{id}`,
      "put",
      await t.update(
        request("PUT", `${txPath}/${tx.data.id}`, { ...body, amount: 50 }),
        context(tx.data.id),
      ),
    );
    expect((await Wallet.findById(wallet))!.balance).toBe(-50);
    await contract(
      version,
      `${catPath}/{id}`,
      "delete",
      await c.remove(request("DELETE", `${catPath}/${id}`), context(id)),
    );
    expect((await Transaction.findById(tx.data.id))!.categoryId).toBeNull();
    expect((await Wallet.findById(wallet))!.balance).toBe(-50);
    const removed = await t.remove(
      request("DELETE", `${txPath}/${tx.data.id}`),
      context(tx.data.id),
    );
    expect(removed.status).toBe(version === "v1" ? 200 : 204);
    await contract(version, `${txPath}/{id}`, "delete", removed);
    expect((await Wallet.findById(wallet))!.balance).toBe(0);
  });
  it("covers transaction invalid body, ID, JSON, token, and ownership responses", async () => {
    const base = version === "v1" ? "/api/v1/transactions" : "/api/transaction";
    const t =
      version === "v1"
        ? {
            create: v1.createTransaction,
            update: v1.updateTransaction,
            remove: v1.deleteTransaction,
          }
        : transactions;
    const invalid = await t.create(request("POST", base, {}), context());
    expect(invalid.status).toBe(version === "v1" ? 400 : 422);
    await contract(version, base, "post", invalid);
    for (const authorization of [
      "",
      "Bearer invalid",
      `Bearer ${jwt.sign({ userId: user, exp: 1 }, process.env.JWT_SECRET!)}`,
    ]) {
      const response = await t.create(
        request("POST", base, {}, { authorization }),
        context(),
      );
      expect(response.status).toBe(401);
      await contract(version, base, "post", response);
    }
    const badId = await t.remove(
      request("DELETE", `${base}/bad`),
      context("bad"),
    );
    expect(badId.status).toBe(version === "v1" ? 400 : 422);
    await contract(version, `${base}/{id}`, "delete", badId);
    const malformed = new NextRequest(`http://localhost:3000${base}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: "{",
    });
    const badJson = await t.create(malformed, context());
    expect(badJson.status).toBe(400);
    await contract(version, base, "post", badJson);
    const foreign = await seedTransaction(
      new Transaction({
        userId: user,
        walletId: wallet,
        type: "expense",
        amount: 1,
        date: new Date(),
        title: "Test transaction",
      }),
    );
    const denied = await t.remove(
      request("DELETE", `${base}/${foreign._id}`, undefined, {
        authorization: `Bearer ${otherToken}`,
      }),
      context(String(foreign._id)),
    );
    expect(denied.status).toBe(404);
    await contract(version, `${base}/{id}`, "delete", denied);
  });
});
describe("v1 wallet API contracts", () => {
  const path = "/api/v1/wallets";

  it("creates and lists whitelisted wallet responses and strips unknown input fields", async () => {
    const body = {
      name: "Contract wallet",
      userId: other,
      balance: 999999,
      unknownField: "ignored",
    };
    const operation = buildSpec("v1").paths[path].post as {
      requestBody: { content: { "application/json": { schema: object } } };
    };
    expect(
      ajv.validate(
        operation.requestBody.content["application/json"].schema,
        body,
      ),
    ).toBe(true);

    const createdResponse = await v1.createWallet(
      request("POST", path, body),
      context(),
    );
    expect(createdResponse.status).toBe(201);
    const created = await contract("v1", path, "post", createdResponse);
    expect(created.data).not.toHaveProperty("userId");
    expect(created.data).not.toHaveProperty("unknownField");
    const stored = await Wallet.findById(created.data.id);
    expect(String(stored!.userId)).toBe(user);
    expect(stored!.balance).toBe(0);

    const listed = await contract(
      "v1",
      path,
      "get",
      await v1.listWallets(request("GET", path), context()),
    );
    expect(listed.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.data.id }),
      ]),
    );
    expect(
      listed.data.every(
        (wallet: Record<string, unknown>) => !("userId" in wallet),
      ),
    ).toBe(true);
  });

  it("matches the documented validation, duplicate, auth, Origin, and media type errors", async () => {
    const invalid = await v1.createWallet(request("POST", path, {}), context());
    expect(invalid.status).toBe(400);
    await contract("v1", path, "post", invalid);

    const duplicate = await v1.createWallet(
      request("POST", path, { name: "Main" }),
      context(),
    );
    expect(duplicate.status).toBe(409);
    const duplicatePayload = await contract("v1", path, "post", duplicate);
    expect(duplicatePayload.error.fields).toEqual({
      name: "A wallet with this name already exists",
    });

    const unauthorized = await v1.createWallet(
      request("POST", path, { name: "No auth" }, {}),
      context(),
    );
    expect(unauthorized.status).toBe(401);
    await contract("v1", path, "post", unauthorized);

    const cookie = `session_token=${token}`;
    const cookieHeaders: Record<string, string>[] = [
      { cookie },
      { cookie, origin: "https://attacker.example" },
    ];
    for (const headers of cookieHeaders) {
      const forbidden = await v1.createWallet(
        request("POST", path, { name: "Blocked" }, headers),
        context(),
      );
      expect(forbidden.status).toBe(403);
      await contract("v1", path, "post", forbidden);
    }

    const wrongMediaType = new NextRequest(`http://localhost:3000${path}`, {
      method: "POST",
      headers: {
        cookie,
        origin: "http://localhost:3000",
        "content-type": "text/plain",
      },
      body: '{"name":"Wrong media type"}',
    });
    const unsupported = await v1.createWallet(wrongMediaType, context());
    expect(unsupported.status).toBe(415);
    await contract("v1", path, "post", unsupported);
  });
});
describe("v1 cookie authentication and CSRF", () => {
  it("accepts a cookie with trusted Origin; rejects missing/foreign Origin and invalid overriding Bearer", async () => {
    const body = { name: "Cookie category", type: "expense" };
    const cookie = `session_token=${token}`;
    for (const headers of [
      { cookie },
      { cookie, origin: "https://attacker.example" },
      {
        cookie,
        origin: "http://localhost:3000",
        authorization: "Bearer invalid",
      },
    ] as Record<string, string>[]) {
      const result = await v1.createCategory(
        request("POST", "/api/v1/categories", body, headers),
        context(),
      );
      expect(result.status).toBe("authorization" in headers ? 401 : 403);
    }
    const result = await v1.createCategory(
      request("POST", "/api/v1/categories", body, {
        cookie,
        origin: "http://localhost:3000",
      }),
      context(),
    );
    expect(result.status).toBe(201);
  });
});

describe("v1 wallet API contracts", () => {
  it("validates the partial update request and wallet response schema", async () => {
    const body = { name: "Updated main", color: "#12AB34" };
    const updateOperation = buildSpec("v1").paths["/api/v1/wallets/{id}"]
      .put as {
      requestBody: { content: { "application/json": { schema: object } } };
    };
    expect(
      ajv.validate(
        updateOperation.requestBody.content["application/json"].schema,
        body,
      ),
    ).toBe(true);
  });
});

describe('v1 monthly transaction reads', () => {
  async function transaction(date: string, title: string, owner = user, categoryId: mongoose.Types.ObjectId | null = null) {
    return seedTransaction(new Transaction({ userId: owner, walletId: wallet, categoryId, type: 'expense', amount: 10, date: new Date(date), title }));
  }

  it('returns only owned transactions inside the month in deterministic newest-first order', async () => {
    const categoryId = new mongoose.Types.ObjectId();
    await transaction('2026-09-30', 'Before');
    const first = await transaction('2026-10-01', 'First');
    const sameDateOlder = await transaction('2026-10-15', 'Same date older');
    const sameDateNewer = await transaction('2026-10-15', 'Same date newer', user, categoryId);
    const last = await transaction('2026-10-31', 'Last');
    await transaction('2026-11-01', 'After');
    await transaction('2026-10-20', 'Foreign', other);

    const response = await v1.listTransactions(request('GET', '/api/v1/transactions?month=2026-10'), context());
    expect(response.status).toBe(200);
    const payload = await contract('v1', '/api/v1/transactions', 'get', response);

    expect(payload.data.map((item: { id: string }) => item.id)).toEqual([
      String(last._id), String(sameDateNewer._id), String(sameDateOlder._id), String(first._id),
    ]);
    expect(payload.data[1]).toEqual(expect.objectContaining({ categoryId: String(categoryId), date: '2026-10-15', title: 'Same date newer' }));
    expect(payload.data[3].categoryId).toBeNull();
    expect(payload.data[0]).not.toHaveProperty('userId');
  });

  it('returns an empty collection and rejects invalid months or missing authentication', async () => {
    const empty = await v1.listTransactions(request('GET', '/api/v1/transactions?month=2024-02'), context());
    expect(await contract('v1', '/api/v1/transactions', 'get', empty)).toEqual({ status: true, data: [] });
    for (const month of ['', '2026-00', '2026-13', '26-10', '2026/10']) {
      const invalid = await v1.listTransactions(request('GET', `/api/v1/transactions?month=${encodeURIComponent(month)}`), context());
      expect(invalid.status).toBe(400);
      await contract('v1', '/api/v1/transactions', 'get', invalid);
    }
    const unauthorized = await v1.listTransactions(request('GET', '/api/v1/transactions?month=2026-10', undefined, {}), context());
    expect(unauthorized.status).toBe(401);
    await contract('v1', '/api/v1/transactions', 'get', unauthorized);
  });

  it('uses the configured current month while excluding another user when month is omitted', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-09T12:00:00.000Z'));
      const owned = await transaction('2026-10-08', 'Owned');
      await transaction('2026-10-08', 'Foreign', other);

      const response = await v1.listTransactions(request('GET', '/api/v1/transactions'), context());
      const payload = await contract('v1', '/api/v1/transactions', 'get', response);
      expect(payload.data.map((item: { id: string }) => item.id)).toEqual([String(owned._id)]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('applies the existing title fallback to legacy documents', async () => {
    const id = new mongoose.Types.ObjectId();
    await Transaction.collection.insertOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(user),
      walletId: new mongoose.Types.ObjectId(wallet),
      categoryId: null,
      type: 'expense',
      amount: 10,
      date: new Date('2026-10-05'),
      recurrence: { isRecurring: false },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const response = await v1.listTransactions(request('GET', '/api/v1/transactions?month=2026-10'), context());
    const payload = await response.json();
    expect(payload.data).toEqual([expect.objectContaining({ id: String(id), title: '(untitled)' })]);
  });
});

describe('v1 wallet API contracts', () => {
  it('validates the partial update request and wallet response schema', async () => {
    const body = { name: 'Updated main', color: '#12AB34' };
    const updateOperation = buildSpec('v1').paths['/api/v1/wallets/{id}'].put as { requestBody: { content: { 'application/json': { schema: object } } } };
    expect(ajv.validate(updateOperation.requestBody.content['application/json'].schema, body)).toBe(true);

    const response = await v1.updateWallet(
      request("PUT", `/api/v1/wallets/${wallet}`, body),
      context(wallet),
    );
    expect(response.status).toBe(200);
    const updated = await contract(
      "v1",
      "/api/v1/wallets/{id}",
      "put",
      response,
    );
    expect(updated.data).toMatchObject({
      id: wallet,
      name: "Updated main",
      color: "#12AB34",
    });
    expect(updated.data).not.toHaveProperty("userId");
  });

  it("validates list/detail responses and never exposes userId", async () => {
    const listed = await contract(
      "v1",
      "/api/v1/wallets",
      "get",
      await v1.listWallets(request("GET", "/api/v1/wallets"), context()),
    );
    expect(listed.data).toEqual([
      expect.objectContaining({ id: wallet, name: "Main" }),
    ]);
    expect(listed.data[0]).not.toHaveProperty("userId");

    const detail = await contract(
      "v1",
      "/api/v1/wallets/{id}",
      "get",
      await v1.getWallet(
        request("GET", `/api/v1/wallets/${wallet}`),
        context(wallet),
      ),
    );
    expect(detail.data).toMatchObject({ id: wallet, name: "Main" });
    expect(detail.data).not.toHaveProperty("userId");

    const invalidId = await v1.getWallet(
      request("GET", "/api/v1/wallets/bad"),
      context("bad"),
    );
    expect(invalidId.status).toBe(400);
    await contract("v1", "/api/v1/wallets/{id}", "get", invalidId);

    const missingId = new mongoose.Types.ObjectId().toString();
    const missing = await v1.getWallet(
      request("GET", `/api/v1/wallets/${missingId}`),
      context(missingId),
    );
    expect(missing.status).toBe(404);
    await contract("v1", "/api/v1/wallets/{id}", "get", missing);

    const foreign = await Wallet.create({ userId: other, name: "Other user" });
    const notOwned = await v1.getWallet(
      request("GET", `/api/v1/wallets/${foreign._id}`),
      context(String(foreign._id)),
    );
    expect(notOwned.status).toBe(404);
    await contract("v1", "/api/v1/wallets/{id}", "get", notOwned);
  });

  it("validates unauthorized list responses and rejects invalid Bearer over a valid cookie", async () => {
    const path = "/api/v1/wallets";
    const missing = await v1.listWallets(
      request("GET", path, undefined, {}),
      context(),
    );
    expect(missing.status).toBe(401);
    await contract("v1", path, "get", missing);

    const invalidBearer = await v1.listWallets(
      request("GET", path, undefined, {
        authorization: "Bearer invalid",
        cookie: `session_token=${token}`,
      }),
      context(),
    );
    expect(invalidBearer.status).toBe(401);
    await contract("v1", path, "get", invalidBearer);
  });

  it("allows cookie-authenticated list and detail reads without Origin and returns an empty list", async () => {
    const cookie = `session_token=${token}`;
    const listed = await v1.listWallets(
      request("GET", "/api/v1/wallets", undefined, { cookie }),
      context(),
    );
    expect(listed.status).toBe(200);
    await contract("v1", "/api/v1/wallets", "get", listed);

    const detail = await v1.getWallet(
      request("GET", `/api/v1/wallets/${wallet}`, undefined, { cookie }),
      context(wallet),
    );
    expect(detail.status).toBe(200);
    await contract("v1", "/api/v1/wallets/{id}", "get", detail);

    await Wallet.deleteMany({ userId: user });
    const empty = await v1.listWallets(
      request("GET", "/api/v1/wallets", undefined, { cookie }),
      context(),
    );
    expect(empty.status).toBe(200);
    expect(
      (await contract("v1", "/api/v1/wallets", "get", empty)).data,
    ).toEqual([]);
  });
});

describe("v1 delete-account contract (session cookie only)", () => {
  const path = "/api/v1/auth/delete-account";
  const cookie = `session_token=${token}`;
  const cookieCleared = () =>
    cookieStore.delete.mock.calls.length + cookieStore.set.mock.calls.length >
    0;
  // request() adds Origin on /auth/ paths and content-type always; headers passed here replace the default Bearer.
  const call = (headers: Record<string, string>) =>
    v1.deleteAccount(request("DELETE", path, undefined, headers), context());

  it("is documented for v1 only, with the session cookie as its only security scheme", () => {
    const operation = buildSpec("v1").paths[path]?.delete as {
      security: unknown;
    };
    expect(operation).toBeDefined();
    expect(operation.security).toEqual([{ sessionCookie: [] }]);
    expect(
      buildSpec("legacy").paths["/api/auth/delete-account"],
    ).toBeUndefined();

    const other = buildSpec("v1").paths["/api/v1/categories/{id}"]?.delete as {
      security: unknown;
    };
    expect(other.security).toEqual([{ bearerAuth: [] }, { sessionCookie: [] }]);
  });

  it("200: cookie auth with a trusted Origin deletes the account and matches the schema", async () => {
    const res = await call({ cookie });
    expect(res.status).toBe(200);
    expect(await contract("v1", path, "delete", res)).toEqual({
      status: true,
      data: { success: true },
    });
    expect(await User.findById(user)).toBeNull();
    expect(await Wallet.countDocuments({ userId: user })).toBe(0);
    expect(cookieCleared()).toBe(true);
  });

  it("200: a bodyless browser-style request without Content-Type succeeds", async () => {
    // What fetch(url, { method: 'DELETE', credentials: 'include' }) sends: cookie and Origin, no body, no content-type.
    const bare = new NextRequest(`http://localhost:3000${path}`, {
      method: "DELETE",
      headers: { cookie, origin: "http://localhost:3000" },
    });
    const res = await v1.deleteAccount(bare, context());
    expect(res.status).toBe(200);
    await contract("v1", path, "delete", res);
    expect(await User.findById(user)).toBeNull();
  });

  it("401: no credentials, nothing deleted", async () => {
    const res = await call({});
    expect(res.status).toBe(401);
    await contract("v1", path, "delete", res);
    expect(await User.findById(user)).not.toBeNull();
  });

  it("401: a valid Bearer token is rejected, nothing deleted and the cookie is kept", async () => {
    const res = await call({ authorization: `Bearer ${token}` });
    expect(res.status).toBe(401);
    await contract("v1", path, "delete", res);
    expect(await User.findById(user)).not.toBeNull();
    expect(await Wallet.countDocuments({ userId: user })).toBe(1);
    expect(cookieCleared()).toBe(false);
  });

  it("401: expired session cookie, nothing deleted", async () => {
    const expired = jwt.sign({ userId: user }, process.env.JWT_SECRET!, {
      expiresIn: "-1s",
    });
    const res = await call({ cookie: `session_token=${expired}` });
    expect(res.status).toBe(401);
    await contract("v1", path, "delete", res);
    expect(await User.findById(user)).not.toBeNull();
  });

  it("401: a valid cookie does not rescue an invalid Bearer header", async () => {
    const res = await call({ cookie, authorization: "Bearer invalid" });
    expect(res.status).toBe(401);
    await contract("v1", path, "delete", res);
    expect(await User.findById(user)).not.toBeNull();
  });

  it("403: cookie auth without an Origin header, nothing deleted", async () => {
    // request() adds an Origin on /auth/ paths, so build this one by hand. Content-Type is included
    // so the failure can only come from the missing Origin.
    const noOrigin = new NextRequest(`http://localhost:3000${path}`, {
      method: "DELETE",
      headers: { cookie, "content-type": "application/json" },
    });
    const res = await v1.deleteAccount(noOrigin, context());
    expect(res.status).toBe(403);
    await contract("v1", path, "delete", res);
    expect(await User.findById(user)).not.toBeNull();
  });

  it("403: cookie auth from a foreign Origin, nothing deleted", async () => {
    const res = await call({ cookie, origin: "https://attacker.example" });
    expect(res.status).toBe(403);
    await contract("v1", path, "delete", res);
    expect(await User.findById(user)).not.toBeNull();
  });

  it("404: valid cookie for an already-deleted user clears the cookie", async () => {
    await User.deleteMany({});
    const res = await call({ cookie });
    expect(res.status).toBe(404);
    await contract("v1", path, "delete", res);
    expect(cookieCleared()).toBe(true);
  });
});
