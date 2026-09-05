import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

/**
 * Hashes a plaintext password using bcrypt.
 */
export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a bcrypt hash.
 */
export function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/**
 * Signs a JWT token with the given payload, expires in 7 days.
 */
export function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Verifies a JWT token and returns the decoded payload.
 */
export function verifyToken<T>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T;
}
