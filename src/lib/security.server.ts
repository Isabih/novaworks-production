import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [kind, salt, expected] = stored.split("$");
  if (kind !== "scrypt" || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expected, "hex");
  return actual.length === expectedBuf.length && timingSafeEqual(actual, expectedBuf);
}

export function validateStrongPassword(password: string) {
  return password.length >= 9 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export function makeToken(bytes = 32) { return randomBytes(bytes).toString("hex"); }
export function makeOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }
export function makeTemporaryPassword() {
  return `Nova!${randomBytes(6).toString("base64url")}9A`;
}
