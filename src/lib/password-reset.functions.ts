import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { rows, uuid } from "./db-utils.server";
import { queryRows, withTransaction } from "./mysql.server";
import { makeOtp, makeToken, hashPassword, verifyPassword, validateStrongPassword } from "./security.server";
import { sendMail } from "./mailer.server";

const digest = (s: string) => createHash("sha256").update(s).digest("hex");
const matches = (a: string, b: string) => {
  const x = Buffer.from(a, "hex"), y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
};
const site = () => (process.env.SITE_URL || "https://novaworks.rw").replace(/\/$/, "");
const safe = (s: string) => s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[c]!);
const validReason = (s: string) => { const v=s.trim(); if(v.length<5||v.length>1000) throw new Error("Reason must contain 5–1000 characters"); return v; };
const requireMail = () => { if(!process.env.RESEND_API_KEY) throw new Error("Email delivery is not configured"); };
const notifyIT = async (subject: string, body: string) => {
  const emails = (process.env.NOVAWORKS_IT_ALERT_EMAILS || "").split(",").map(x=>x.trim()).filter(Boolean);
  if(!emails.length) throw new Error("IT alert recipients are not configured");
  await sendMail(emails, subject, body);
};
async function auditTx(conn:any, actor:string|null, action:string, id:string, details:object={}) {
  await conn.execute("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,new_values) VALUES(?,?,'password_security',?,?)",
    [actor,action,id,JSON.stringify(details)]);
}
async function begin(user:{id:string;email:string;full_name:string}, type:"forgot"|"change", reason:string) {
  requireMail();
  const otp=makeOtp(), id=uuid();
  const recent=await rows<any>("SELECT id FROM password_security_requests WHERE user_id=? AND created_at>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 60 SECOND) LIMIT 1",[user.id]);
  if(recent.length) return {ok:true};
  await withTransaction(async conn=>{
    await conn.execute(`INSERT INTO password_security_requests
      (id,user_id,request_type,email,reason,otp_hash,otp_expires_at,expires_at)
      VALUES(?,?,?,?,?, ?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 5 MINUTE),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 24 HOUR))`,
      [id,user.id,type,user.email,reason,digest(id+":"+otp)]);
    await auditTx(conn,user.id,"PASSWORD_REQUEST_CREATED",id,{type});
  });
  // Failure leaves an auditable pending request; user may initiate a fresh request after cooldown.
  await Promise.all([
    sendMail(user.email,"NOVAWORKS password request verification",`<p>Your verification code is <b>${otp}</b>. It expires in 5 minutes.</p>`),
    notifyIT("NOVAWORKS password request received",`<p>A ${type} password request was submitted for ${safe(user.email)}. Request ID: ${id}. Approval is disabled until email verification.</p>`)
  ]);
  return {ok:true};
}

export const requestPasswordReset=createServerFn({method:"POST"})
 .validator((d:{email:string;reason?:string})=>d)
 .handler(async({data})=>{
   const email=String(data.email||"").trim().toLowerCase();
   const reason=validReason(String(data.reason||""));
   const user=(await rows<any>("SELECT id,email,full_name FROM users WHERE active=1 AND (LOWER(email)=? OR LOWER(business_email)=? OR LOWER(secondary_email)=?) LIMIT 1",[email,email,email]))[0];
   if(user) await begin(user,"forgot",reason);
   return {ok:true};
 });

export const requestPasswordChange=createServerFn({method:"POST"}).middleware([requireMysqlAuth])
 .validator((d:{current_password:string;reason:string})=>d)
 .handler(async({data,context})=>{
   const u=(await rows<any>("SELECT id,email,full_name,password_hash FROM users WHERE id=? AND active=1",[context.userId]))[0];
   if(!u||!data.current_password||!verifyPassword(data.current_password,u.password_hash)) throw new Error("Current password is incorrect");
   return begin(u,"change",validReason(data.reason));
 });

export const verifyPasswordResetOtp=createServerFn({method:"POST"})
 .validator((d:{email:string;code:string})=>d)
 .handler(async({data})=>{
   const email=String(data.email||"").trim().toLowerCase(), code=String(data.code||"");
   if(!/^\d{6}$/.test(code)) throw new Error("Invalid or expired code");
   let verified=false, requestId="";
   await withTransaction(async conn=>{
     const [found]:any=await conn.execute(`SELECT * FROM password_security_requests WHERE email=? AND status='requested'
       AND expires_at>UTC_TIMESTAMP() ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,[email]);
     const r=found[0];
     if(!r) return;
     requestId=r.id;
     if(r.otp_attempts>=5||new Date(r.otp_expires_at).getTime()<=Date.now()) return;
     if(!matches(digest(r.id+":"+code),r.otp_hash)){
       await conn.execute("UPDATE password_security_requests SET otp_attempts=otp_attempts+1 WHERE id=?",[r.id]);
       await auditTx(conn,r.user_id,"PASSWORD_OTP_FAILED",r.id);
       return;
     }
     await conn.execute("UPDATE password_security_requests SET status='email_verified',otp_verified_at=UTC_TIMESTAMP(),otp_hash=REPEAT('0',64) WHERE id=?",[r.id]);
     await auditTx(conn,r.user_id,"PASSWORD_EMAIL_VERIFIED",r.id);
     verified=true;
   });
   if(!verified) throw new Error("Invalid or expired code");
   await notifyIT("NOVAWORKS password request awaiting approval",`<p>Email verified for request ${requestId}. Sign in to the IT dashboard to review.</p>`);
   return {ok:true};
 });

export const listPasswordResetRequests=createServerFn({method:"GET"}).middleware([requireMysqlAuth])
 .handler(async({context})=>{
   if(!context.roles.includes("it")) throw new Error("IT access required");
   return rows<any>(`SELECT id,user_id,email,request_type,reason,status,created_at,otp_verified_at,approved_by,approval_reason,completed_at
     FROM password_security_requests ORDER BY created_at DESC LIMIT 300`);
 });

export const approvePasswordReset=createServerFn({method:"POST"}).middleware([requireMysqlAuth])
 .validator((d:{id:string;reason:string})=>d)
 .handler(async({data,context})=>{
   if(!context.roles.includes("it")) throw new Error("IT access required");
   requireMail();
   const reason=validReason(data.reason), token=makeToken(32);
   let email="";
   await withTransaction(async conn=>{
     const [found]:any=await conn.execute("SELECT * FROM password_security_requests WHERE id=? FOR UPDATE",[data.id]);
     const r=found[0];
     if(!r||r.status!=="email_verified"||new Date(r.expires_at).getTime()<=Date.now()) throw new Error("Email-verified pending request required");
     if(r.user_id===context.userId) throw new Error("IT self-approval is prohibited");
     email=r.email;
     await conn.execute(`UPDATE password_security_requests SET status='approved',approved_by=?,approval_reason=?,
       approved_at=UTC_TIMESTAMP(),completion_token_hash=?,completion_expires_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE) WHERE id=?`,
       [context.userId,reason,digest(token),data.id]);
     await auditTx(conn,context.userId,"PASSWORD_REQUEST_APPROVED",data.id,{reason});
   });
   const link=`${site()}/auth/password-reset?request=${encodeURIComponent(data.id)}&token=${encodeURIComponent(token)}`;
   await sendMail(email,"NOVAWORKS password request approved",`<p>IT approved your request. <a href="${safe(link)}">Set your new password</a>. This link expires in 15 minutes.</p>`);
   await notifyIT("NOVAWORKS password request approved",`<p>Request ${data.id} was approved by IT. Reason: ${safe(reason)}</p>`);
   return {ok:true};
 });

export const denyPasswordReset=createServerFn({method:"POST"}).middleware([requireMysqlAuth])
 .validator((d:{id:string;reason:string})=>d)
 .handler(async({data,context})=>{
   if(!context.roles.includes("it")) throw new Error("IT access required");
   const reason=validReason(data.reason);let email="";
   await withTransaction(async conn=>{
     const [found]:any=await conn.execute("SELECT * FROM password_security_requests WHERE id=? FOR UPDATE",[data.id]);
     const r=found[0];
     if(!r||r.status!=="email_verified") throw new Error("Email-verified pending request required");
     if(r.user_id===context.userId) throw new Error("IT self-review is prohibited");
     email=r.email;
     await conn.execute("UPDATE password_security_requests SET status='rejected',approved_by=?,approval_reason=? WHERE id=?",[context.userId,reason,data.id]);
     await auditTx(conn,context.userId,"PASSWORD_REQUEST_REJECTED",data.id,{reason});
   });
   await Promise.all([
     sendMail(email,"NOVAWORKS password request rejected",`<p>Your password request was rejected. Reason: ${safe(reason)}</p>`),
     notifyIT("NOVAWORKS password request rejected",`<p>Request ${data.id} was rejected. Reason: ${safe(reason)}</p>`)
   ]);
   return {ok:true};
 });

export const completePasswordReset=createServerFn({method:"POST"})
 .validator((d:{id:string;token:string;new_password:string})=>d)
 .handler(async({data})=>{
   if(!validateStrongPassword(data.new_password)) throw new Error("Password does not meet security requirements");
   if(!/^[a-f0-9]{64}$/i.test(data.token)) throw new Error("Invalid or expired reset link");
   let email="";
   await withTransaction(async conn=>{
     const [found]:any=await conn.execute("SELECT * FROM password_security_requests WHERE id=? FOR UPDATE",[data.id]);
     const r=found[0];
     if(!r||r.status!=="approved"||!r.approved_by||!r.otp_verified_at||!r.completion_token_hash||
        new Date(r.completion_expires_at).getTime()<=Date.now()||!matches(digest(data.token),r.completion_token_hash)) throw new Error("Invalid or expired reset link");
     email=r.email;
     await conn.execute("UPDATE users SET password_hash=?,must_change_password=0 WHERE id=?",[hashPassword(data.new_password),r.user_id]);
     await conn.execute("UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP() WHERE user_id=? AND revoked_at IS NULL",[r.user_id]);
     await conn.execute("UPDATE password_security_requests SET status='completed',completion_token_hash=NULL,completed_at=UTC_TIMESTAMP() WHERE id=?",[r.id]);
     await auditTx(conn,r.user_id,"PASSWORD_CHANGED",r.id,{approved_by:r.approved_by});
   });
   await Promise.all([
     sendMail(email,"NOVAWORKS password changed", "<p>Your password has been changed and previous sessions have been signed out.</p>"),
     notifyIT("NOVAWORKS password change completed",`<p>Request ${data.id} has been completed.</p>`)
   ]);
   return {ok:true};
 });
