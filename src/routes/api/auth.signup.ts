import { createFileRoute } from "@tanstack/react-router";
import type { RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { queryRows } from "@/lib/mysql.server";
import { hashPassword, makeOtp, validateStrongPassword } from "@/lib/security.server";
import { sendMail } from "@/lib/mailer.server";

export const Route=createFileRoute("/api/auth/signup")({server:{handlers:{POST:async({request})=>{
 const b=await request.json() as any; const email=String(b.email||"").trim().toLowerCase(); const pwd=String(b.password||"");
 if(!/^\S+@\S+\.\S+$/.test(email)) return Response.json({error:"Enter a valid email"},{status:400});
 if(!validateStrongPassword(pwd,String(b.full_name||""),email)) return Response.json({error:"Use 12+ characters, upper/lowercase, a number and symbol; avoid your name, email, and sequential numbers."},{status:400});
 const exists=await queryRows<(RowDataPacket&any)[]>(`SELECT id FROM users WHERE LOWER(email)=? LIMIT 1`,[email]);
 if(exists[0]) return Response.json({error:"An account already exists for this email"},{status:409});
 if(!process.env.RESEND_API_KEY) return Response.json({error:"Registration email delivery is not configured. Please contact support."},{status:503});
 const id=randomUUID(); await queryRows<any>(`INSERT INTO users(id,email,full_name,phone,password_hash) VALUES(?,?,?,?,?)`,[id,email,String(b.full_name||"").trim(),b.phone||null,hashPassword(pwd)]);
 await queryRows<any>(`INSERT INTO user_roles(user_id,role) VALUES(?, 'customer')`,[id]);
 const code=makeOtp(); await queryRows<any>(`INSERT INTO email_verification_codes(id,user_id,email,code,expires_at) VALUES(UUID(),?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 5 MINUTE))`,[id,email,code]);
 try { const sent=await sendMail(email,"Verify your NOVAWORKS email",`<h2>Your verification code</h2><p style="font-size:28px;letter-spacing:6px"><b>${code}</b></p><p>It expires in 5 minutes.</p>`); if(sent?.id==="dev-mail-disabled") throw new Error("Email delivery disabled"); } catch(err) { console.error("Signup verification delivery failed",err); return Response.json({error:"Account created, but the verification email could not be delivered. Sign in to request another code."},{status:503}); }
 return Response.json({ok:true,email});
}}}});
