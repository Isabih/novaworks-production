import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { randomInt } from "node:crypto";

// Source-level regression tests until the integration harness is available.
const otpSource = readFileSync("src/lib/security.server.ts", "utf8");
const changeSource = readFileSync("src/routes/api/auth.change-password.ts", "utf8");

test("OTP generation uses cryptographic randomInt", () => {
  assert.match(otpSource, /randomInt\(100000,\s*1000000\)/);
  assert.doesNotMatch(otpSource, /Math\.random\(/);
  for (let i = 0; i < 10000; i++) {
    const otp = String(randomInt(100000, 1000000));
    assert.match(otp, /^[1-9][0-9]{5}$/);
  }
});

test("legacy change-password route cannot update credentials", () => {
  assert.match(changeSource, /status:\s*403/);
  assert.doesNotMatch(changeSource, /UPDATE\s+users/i);
  assert.doesNotMatch(changeSource, /hashPassword\s*\(/);
});
