import { createFileRoute } from "@tanstack/react-router";
import type { RowDataPacket } from "mysql2/promise";
import { queryRows } from "@/lib/mysql.server";
import { createSession } from "@/lib/auth.server";
import { verifyPassword } from "@/lib/security.server";

export const Route = createFileRoute("/api/auth/login")({ server: { handlers: {
  POST: async ({ request }) => {
    const body = await request.json() as any;
    const email = String(body.email || "").trim().toLowerCase();
    const rows = await queryRows<(RowDataPacket & any)[]>(`SELECT * FROM users WHERE LOWER(email)=? OR LOWER(business_email)=? OR LOWER(secondary_email)=? LIMIT 1`, [email,email,email]);
    const user = rows[0];
    if (!user || !user.active || !verifyPassword(String(body.password || ""), user.password_hash)) return Response.json({ error: "Invalid email or password" }, { status: 401 });
    if (!user.email_verified_at) return Response.json({ error: "EMAIL_NOT_VERIFIED", email: user.email }, { status: 403 });
    const token = await createSession(user.id, !!body.remember);
    return Response.json({ token });
  }
}}});
