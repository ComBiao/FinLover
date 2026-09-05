import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

/** Documented default, mirrored in `.env.example`. */
export const DEFAULT_SALT_ROUNDS = 10;

/** bcrypt only accepts a cost factor in this range. */
const MIN_SALT_ROUNDS = 4;
const MAX_SALT_ROUNDS = 31;

/**
 * Read at call time (not module load) so the value stays correct after the
 * environment changes, and falls back to the documented default when the var is
 * unset, empty, or not a usable cost factor — bcrypt throws on `NaN`/`0`.
 */
function saltRounds() {
  const raw = process.env.BCRYPT_SALT_ROUNDS;
  if (!raw) return DEFAULT_SALT_ROUNDS;

  const parsed = Number(raw);
  const usable =
    Number.isInteger(parsed) &&
    parsed >= MIN_SALT_ROUNDS &&
    parsed <= MAX_SALT_ROUNDS;

  return usable ? parsed : DEFAULT_SALT_ROUNDS;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, saltRounds());
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken<T>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T;
}
