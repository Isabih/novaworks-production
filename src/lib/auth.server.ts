import type { RowDataPacket } from "mysql2/promise";
import { queryRows } from "./mysql.server";
import { makeToken } from "./security.server";

export type DbRole = "it" | "admin" | "receptionist" | "agent" | "customer" | "owner";

export async function createSession(userId: string, remember = false) {
  const token = makeToken(40);
  const hours = remember ? 24 * 30 : 12;
  await queryRows<any>(`INSERT INTO auth_sessions(token,user_id,expires_at,last_seen_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR),UTC_TIMESTAMP())`, [token, userId, hours]);
  return token;
}

export interface SessionUser { id:string; email:string; business_email?:string|null; secondary_email?:string|null; full_name:string; phone?:string|null; avatar_url?:string|null; active:number|boolean; must_change_password?:number|boolean; email_verified_at?:string|null; expires_at:any; roles:DbRole[] }

export async function getSessionUser(token?: string | null) {
  if (!token) return null;
  const rows = await queryRows<(RowDataPacket & any)[]>(`
    SELECT u.id,u.email,u.business_email,u.secondary_email,u.full_name,u.phone,u.avatar_url,u.active,u.must_change_password,u.email_verified_at,s.expires_at
    FROM auth_sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token=? AND s.revoked_at IS NULL AND s.expires_at>UTC_TIMESTAMP() AND u.active=1 LIMIT 1`, [token]);
  const user = rows[0];
  if (!user) return null;
  await queryRows<any>(`UPDATE auth_sessions SET last_seen_at=UTC_TIMESTAMP() WHERE token=?`, [token]);
  const roleRows = await queryRows<(RowDataPacket & { role: DbRole })[]>(`SELECT role FROM user_roles WHERE user_id=?`, [user.id]);
  return { ...user, roles: roleRows.map((r) => r.role) };
}

export async function revokeSession(token: string) {
  await queryRows<any>(`UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP() WHERE token=?`, [token]);
}

export function bearer(request: Request) {
  const h = request.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}
