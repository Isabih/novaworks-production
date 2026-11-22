import { createFileRoute } from "@tanstack/react-router";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { queryRows } from "@/lib/mysql.server";
import { createSession } from "@/lib/auth.server";
import { makeOtp } from "@/lib/security.server";
import { sendMail } from "@/lib/mailer.server";

export const Route=createFileRoute("/api/auth/otp")({server:{handlers:{
 POST:async({request})=>{
  const noStore={"Cache-Control":"no-store"};
  const b=await request.json() as any;
  const email=String(b.email||"").trim().toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(email)) return Response.json({error:"Enter a valid email"},{status:400,headers:noStore});
  const users=await queryRows<(RowDataPacket&any)[]>(`SELECT id,email_verified_at FROM users WHERE LOWER(email)=? LIMIT 1`,[email]);
  const user=users[0];
  // Do not disclose whether an address exists.
  if(!user || user.email_verified_at) return Response.json({ok:true},{headers:noStore});
  const recent=await queryRows<(RowDataPacket&any)[]>(`SELECT TIMESTAMPDIFF(SECOND,created_at,UTC_TIMESTAMP()) AS age_seconds FROM email_verification_codes WHERE user_id=? AND purpose='account_verify' ORDER BY created_at DESC LIMIT 1`,[user.id]);
  if(recent[0] && Number(recent[0].age_seconds)<45){
    const retryAfter=Math.max(1,45-Math.max(0,Number(recent[0].age_seconds)));
    return Response.json({error:`Please wait ${retryAfter} seconds before requesting another code`,retry_after:retryAfter},{status:429,headers:{...noStore,"Retry-After":String(retryAfter)}});
  }
  if(!process.env.RESEND_API_KEY) return Response.json({error:"Email delivery is not configured. Please contact support."},{status:503,headers:noStore});
  const code=makeOtp();
  const id=randomUUID();
  // Keep the previous code valid if the provider fails.
  await queryRows<any>(`INSERT INTO email_verification_codes(id,user_id,email,code,purpose,expires_at) VALUES(?,?,?,?, 'account_verify',DATE_ADD(UTC_TIMESTAMP(),INTERVAL 5 MINUTE))`,[id,user.id,email,code]);
  try{
    const result=await sendMail(email,"NOVAWORKS verification code",`<p>Your 6-digit verification code is <b style="font-size:24px">${code}</b>. It expires in 5 minutes.</p>`);
    if(result?.id==="dev-mail-disabled") throw new Error("Email delivery is disabled");
  }catch(err){
    await queryRows<any>(`DELETE FROM email_verification_codes WHERE id=?`,[id]);
    console.error("Verification email delivery failed",err);
    return Response.json({error:"We could not send the verification email. Please try again shortly."},{status:503,headers:noStore});
  }
  await queryRows<any>(`DELETE FROM email_verification_codes WHERE user_id=? AND id<>? AND purpose='account_verify'`,[user.id,id]);
  return Response.json({ok:true},{headers:noStore});
 },
 PUT:async({request})=>{const b=await request.json() as any;const email=String(b.email||"").trim().toLowerCase();const rows=await queryRows<(RowDataPacket&any)[]>(`SELECT ev.user_id FROM email_verification_codes ev WHERE LOWER(ev.email)=? AND ev.code=? AND ev.expires_at>UTC_TIMESTAMP() ORDER BY ev.created_at DESC LIMIT 1`,[email,String(b.code||"")]);if(!rows[0])return Response.json({error:"Invalid or expired verification code"},{status:400});await queryRows<any>(`UPDATE users SET email_verified_at=COALESCE(email_verified_at,UTC_TIMESTAMP()) WHERE id=?`,[rows[0].user_id]);await queryRows<any>(`DELETE FROM email_verification_codes WHERE user_id=?`,[rows[0].user_id]);const token=await createSession(rows[0].user_id,false);return Response.json({token});}
}}});
