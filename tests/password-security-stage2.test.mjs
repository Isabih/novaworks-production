import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const backend=readFileSync("src/lib/password-reset.functions.ts","utf8");
const migration=readFileSync("mysql/migrations/2026-11-18-password-security.sql","utf8");
const itUi=readFileSync("src/routes/_authenticated/dashboard.it.password-resets.tsx","utf8");
test("OTP stored as a digest with bounded attempts and expiry",()=>{
 assert.match(backend,/digest\(id\+"\:"\+otp\)/);
 assert.match(backend,/otp_attempts>=5/);
 assert.match(migration,/INTERVAL|otp_expires_at/);
});
test("IT approval requires email verification, reason and independent approver",()=>{
 assert.match(backend,/r\.status!=="email_verified"/);
 assert.match(backend,/r\.user_id===context\.userId/);
 assert.match(backend,/validReason\(data\.reason\)/);
 assert.match(itUi,/Mandatory IT decision reason/);
});
test("completion requires IT approval and token, revokes sessions and audits",()=>{
 assert.match(backend,/r\.status!=="approved"/);
 assert.match(backend,/completion_token_hash/);
 assert.match(backend,/UPDATE auth_sessions SET revoked_at/);
 assert.match(backend,/PASSWORD_CHANGED/);
 assert.doesNotMatch(backend,/makeTemporaryPassword/);
});
test("all writes occur on new isolated table",()=>{
 assert.match(migration,/CREATE TABLE IF NOT EXISTS password_security_requests/);
 assert.match(backend,/withTransaction/);
});
