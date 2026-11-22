import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

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

export function validateStrongPassword(password: string, fullName = "", email = "") {
  const tokens = [fullName, email.split("@")[0]].flatMap(v => v.toLowerCase().split(/[^a-z0-9]+/)).filter(v => v.length >= 3);
  return password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) &&
    /\d/.test(password) && /[^A-Za-z0-9]/.test(password) &&
    !tokens.some(t => password.toLowerCase().includes(t)) &&
    !/(?:012|123|234|345|456|567|678|789|890|987|876|765|654|543|432|321|210)/.test(password);
}

export function makeToken(bytes = 32) { return randomBytes(bytes).toString("hex"); }
export function makeOtp() { return String(randomInt(100000, 1000000)); }
export function makeTemporaryPassword() {
  return `Nova!${randomBytes(6).toString("base64url")}9A`;
}
