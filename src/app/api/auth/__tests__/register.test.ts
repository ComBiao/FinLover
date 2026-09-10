// @vitest-environment node
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcrypt";

// The route talks to the default mongoose connection, which these tests point
// at an in-memory server themselves — so `connectDB` (which throws at import
// without MONGODB_URI) is replaced with a spy we can also assert on.
vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => undefined) }));

import { POST } from "@/app/api/auth/register/route";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

const VALID_BODY = {
  email: "user@example.com",
  password: "Passw0rd!",
  confirmPassword: "Passw0rd!",
  dataPrivacyConsent: true,
};

let mongoServer: MongoMemoryServer;

function request(rawBody: string) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: rawBody,
  });
}

async function post(body: unknown) {
  const res = await POST(request(JSON.stringify(body)));
  return { res, json: await res.json() };
}

beforeAll(async () => {
  // Keeps bcrypt cheap across the suite; cost factor is exercised in auth.test.ts.
  vi.stubEnv("BCRYPT_SALT_ROUNDS", "4");

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  // The 409 path depends on the unique email index actually existing.
  await User.init();
}, 60_000);

afterAll(async () => {
  vi.unstubAllEnvs();
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  vi.clearAllMocks();
  await User.deleteMany({});
});

describe("POST /api/auth/register", () => {
  describe("valid registration", () => {
    it("creates the user and responds 201 with public fields only", async () => {
      const { res, json } = await post(VALID_BODY);

      expect(res.status).toBe(201);
      expect(json.user).toMatchObject({
        email: "user@example.com",
        dataPrivacyConsent: true,
      });
      expect(json.user.id).toEqual(expect.any(String));
      expect(await User.countDocuments()).toBe(1);
    });

    it("never exposes the password hash or the plaintext password", async () => {
      const { json } = await post(VALID_BODY);
      const serialized = JSON.stringify(json);

      expect(serialized).not.toContain("passwordHash");
      expect(serialized).not.toContain(VALID_BODY.password);
    });

    it("stores a bcrypt hash rather than the plaintext password", async () => {
      await post(VALID_BODY);
      const user = await User.findOne({ email: "user@example.com" });

      expect(user).not.toBeNull();
      expect(user!.passwordHash.startsWith("$2")).toBe(true);
      expect(user!.passwordHash).not.toBe(VALID_BODY.password);
      expect(await bcrypt.compare(VALID_BODY.password, user!.passwordHash)).toBe(
        true
      );
      expect(await bcrypt.compare("WrongPass1!", user!.passwordHash)).toBe(
        false
      );
    });

    it("normalizes the email to lowercase", async () => {
      const { res, json } = await post({
        ...VALID_BODY,
        email: "User@Example.COM",
      });

      expect(res.status).toBe(201);
      expect(json.user.email).toBe("user@example.com");
    });
  });

  describe("validation failures", () => {
    it("rejects a malformed email with 400 and a field-level error", async () => {
      const { res, json } = await post({ ...VALID_BODY, email: "user@example" });

      expect(res.status).toBe(400);
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.fields.email).toBeDefined();
      expect(await User.countDocuments()).toBe(0);
    });

    it("rejects mismatched password confirmation with 400", async () => {
      const { res, json } = await post({
        ...VALID_BODY,
        confirmPassword: "Different1!",
      });

      expect(res.status).toBe(400);
      expect(json.error.fields.confirmPassword).toBeDefined();
      expect(await User.countDocuments()).toBe(0);
    });

    it("rejects a password shorter than 8 characters with 400", async () => {
      const { res, json } = await post({
        ...VALID_BODY,
        password: "abc",
        confirmPassword: "abc",
      });

      expect(res.status).toBe(400);
      expect(json.error.fields.password).toBeDefined();
      expect(await User.countDocuments()).toBe(0);
    });

    it("accepts a password of exactly 72 UTF-8 bytes", async () => {
      const password = "a".repeat(72);
      const { res } = await post({
        ...VALID_BODY,
        password,
        confirmPassword: password,
      });

      expect(res.status).toBe(201);
    });

    it("rejects a password longer than 72 UTF-8 bytes, which bcrypt would silently truncate", async () => {
      const password = "a".repeat(73);
      const { res, json } = await post({
        ...VALID_BODY,
        password,
        confirmPassword: password,
      });

      expect(res.status).toBe(400);
      expect(json.error.fields.password).toBeDefined();
      expect(await User.countDocuments()).toBe(0);
    });

    it("counts the password limit in bytes, not characters", async () => {
      // 19 emoji = 19 characters but 76 UTF-8 bytes.
      const password = "🔒".repeat(19);
      const { res, json } = await post({
        ...VALID_BODY,
        password,
        confirmPassword: password,
      });

      expect(res.status).toBe(400);
      expect(json.error.fields.password).toBeDefined();
      expect(await User.countDocuments()).toBe(0);
    });

    it("rejects a body with confirmPassword missing entirely with 400, not 500", async () => {
      const { email, password, dataPrivacyConsent } = VALID_BODY;
      const { res, json } = await post({ email, password, dataPrivacyConsent });

      expect(res.status).toBe(400);
      expect(json.error.fields.confirmPassword).toBeDefined();
      expect(await User.countDocuments()).toBe(0);
    });

    it("rejects a malformed JSON body with 400, not 500", async () => {
      const res = await POST(request("{ not json"));

      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("INVALID_JSON");
      expect(await User.countDocuments()).toBe(0);
    });
  });

  describe("data privacy consent", () => {
    it("persists the consent flag and its timestamp on success", async () => {
      const before = Date.now();
      const { json } = await post(VALID_BODY);
      const user = await User.findById(json.user.id);

      expect(user!.dataPrivacyConsent).toBe(true);
      // `createdAt` is the consent timestamp: the record cannot exist without consent.
      expect(user!.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(user!.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
      expect(json.user.createdAt).toBe(user!.createdAt.toISOString());
    });

    it("rejects dataPrivacyConsent: false with 400 before touching the database", async () => {
      const { res, json } = await post({
        ...VALID_BODY,
        dataPrivacyConsent: false,
      });

      expect(res.status).toBe(400);
      expect(json.error.code).toBe("CONSENT_REQUIRED");
      expect(json.error.message).toMatch(/consent/i);
      expect(vi.mocked(connectDB)).not.toHaveBeenCalled();
      expect(await User.countDocuments()).toBe(0);
    });

    it("treats an omitted dataPrivacyConsent as refusal, not as 'no opinion'", async () => {
      const { email, password, confirmPassword } = VALID_BODY;
      const { res, json } = await post({ email, password, confirmPassword });

      expect(res.status).toBe(400);
      expect(json.error.code).toBe("CONSENT_REQUIRED");
      expect(vi.mocked(connectDB)).not.toHaveBeenCalled();
      expect(await User.countDocuments()).toBe(0);
    });

    it("rejects a truthy-but-not-true consent value", async () => {
      const { res } = await post({ ...VALID_BODY, dataPrivacyConsent: "true" });

      expect(res.status).toBe(400);
      expect(await User.countDocuments()).toBe(0);
    });

    it("keeps the consent timestamp immutable when other fields change later", async () => {
      const { json } = await post(VALID_BODY);
      const created = await User.findById(json.user.id);
      const consentedAt = created!.createdAt.getTime();

      await new Promise((resolve) => setTimeout(resolve, 10));
      await User.findByIdAndUpdate(json.user.id, {
        passwordHash: await bcrypt.hash("Another1!", 4),
      });

      const updated = await User.findById(json.user.id);
      expect(updated!.createdAt.getTime()).toBe(consentedAt);
      expect(updated!.updatedAt.getTime()).toBeGreaterThan(consentedAt);
    });
  });

  describe("duplicate email", () => {
    it("responds 409 without writing a second document", async () => {
      await post(VALID_BODY);

      const { res, json } = await post(VALID_BODY);

      expect(res.status).toBe(409);
      expect(json.error.code).toBe("EMAIL_ALREADY_EXISTS");
      expect(await User.countDocuments()).toBe(1);
    });

    it("responds 409 for the same email in different casing", async () => {
      await post(VALID_BODY);

      const { res } = await post({ ...VALID_BODY, email: "USER@example.com" });

      expect(res.status).toBe(409);
      expect(await User.countDocuments()).toBe(1);
    });
  });
});
