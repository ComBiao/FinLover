// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SALT_ROUNDS,
  comparePassword,
  hashPassword,
} from "@/lib/auth";

const PASSWORD = "Passw0rd!";

/** bcrypt hashes look like `$2b$10$<22-char salt><31-char digest>`. */
function costFactorOf(hash: string) {
  return Number(hash.split("$")[2]);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("hashPassword", () => {
  it("produces a bcrypt hash, never the plaintext password", async () => {
    const hash = await hashPassword(PASSWORD);

    expect(hash.startsWith("$2")).toBe(true);
    expect(hash).not.toContain(PASSWORD);
  });

  it("salts each hash, so the same password hashes differently every time", async () => {
    const [first, second] = await Promise.all([
      hashPassword(PASSWORD),
      hashPassword(PASSWORD),
    ]);

    expect(first).not.toBe(second);
    expect(await comparePassword(PASSWORD, first)).toBe(true);
    expect(await comparePassword(PASSWORD, second)).toBe(true);
  });

  it("uses the cost factor from BCRYPT_SALT_ROUNDS", async () => {
    vi.stubEnv("BCRYPT_SALT_ROUNDS", "4");

    expect(costFactorOf(await hashPassword(PASSWORD))).toBe(4);
  });

  it("falls back to the documented default when BCRYPT_SALT_ROUNDS is unset", async () => {
    vi.stubEnv("BCRYPT_SALT_ROUNDS", undefined);

    const hash = await hashPassword(PASSWORD);

    expect(costFactorOf(hash)).toBe(DEFAULT_SALT_ROUNDS);
    expect(await comparePassword(PASSWORD, hash)).toBe(true);
  });

  it.each(["", "abc", "0", "99", "10.5"])(
    "falls back to the default rather than hashing with an unusable cost factor (%j)",
    async (value) => {
      vi.stubEnv("BCRYPT_SALT_ROUNDS", value);

      expect(costFactorOf(await hashPassword(PASSWORD))).toBe(
        DEFAULT_SALT_ROUNDS
      );
    }
  );
});

describe("comparePassword", () => {
  it("resolves true for the correct password", async () => {
    const hash = await hashPassword(PASSWORD);

    expect(await comparePassword(PASSWORD, hash)).toBe(true);
  });

  it("resolves false for a wrong password", async () => {
    const hash = await hashPassword(PASSWORD);

    expect(await comparePassword("WrongPass1!", hash)).toBe(false);
  });

  it("resolves false rather than throwing on a non-bcrypt hash", async () => {
    expect(await comparePassword(PASSWORD, "not-a-hash")).toBe(false);
  });
});
