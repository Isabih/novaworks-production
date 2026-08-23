import { createFileRoute } from "@tanstack/react-router";
import type { RowDataPacket } from "mysql2/promise";
import { queryRows } from "@/lib/mysql.server";
import { createSession } from "@/lib/auth.server";
import { makeOtp } from "@/lib/security.server";
import { sendMail } from "@/lib/mailer.server";

export const Route=createFileRoute("/api/auth/otp")({server:{handlers:{
 POST:async({request})=>{const b=await request.json() as any;const email=String(b.email||"").trim().toLowerCase();const users=await queryRows<(RowDataPacket&any)[]>(`SELECT id FROM users WHERE LOWER(email)=? LIMIT 1`,[email]);if(!users[0]) return Response.json({ok:true});const code=makeOtp();await queryRows<any>(`DELETE FROM email_verification_codes WHERE user_id=?`,[users[0].id]);await queryRows<any>(`INSERT INTO email_verification_codes(id,user_id,email,code,expires_at) VALUES(UUID(),?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 5 MINUTE))`,[users[0].id,email,code]);await sendMail(email,"NOVAWORKS verification code",`<p>Your 6-digit verification code is <b style="font-size:24px">${code}</b>. It expires in 5 minutes.</p>`);return Response.json({ok:true});},
 PUT:async({request})=>{const b=await request.json() as any;const email=String(b.email||"").trim().toLowerCase();const rows=await queryRows<(RowDataPacket&any)[]>(`SELECT ev.user_id FROM email_verification_codes ev WHERE LOWER(ev.email)=? AND ev.code=? AND ev.expires_at>UTC_TIMESTAMP() ORDER BY ev.created_at DESC LIMIT 1`,[email,String(b.code||"")]);if(!rows[0])return Response.json({error:"Invalid or expired verification code"},{status:400});await queryRows<any>(`UPDATE users SET email_verified_at=COALESCE(email_verified_at,UTC_TIMESTAMP()) WHERE id=?`,[rows[0].user_id]);await queryRows<any>(`DELETE FROM email_verification_codes WHERE user_id=?`,[rows[0].user_id]);const token=await createSession(rows[0].user_id,false);return Response.json({token});}
}}});
