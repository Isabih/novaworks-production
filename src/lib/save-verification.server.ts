import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import type { PoolConnection } from "mysql2/promise";

const secret=()=>{const s=process.env.NOVAWORKS_SECURITY_SECRET;if(!s||s.length<32)throw new Error("NOVAWORKS_SECURITY_SECRET must contain at least 32 characters");return s;};
const hash=async(s:string)=>(await import("node:crypto")).createHash("sha256").update(s).digest("hex");
const hmac=async(s:string)=>(await import("node:crypto")).createHmac("sha256",secret()).update(s).digest("hex");
const canonical=(value:any):string=>JSON.stringify(value,(_key,v)=>v&&typeof v==="object"&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const payloadHash=(action:string,payload:any)=>hash(action+":"+canonical(payload));
const permitted=new Set(["HOME_CONTENT_UPDATE","CONTACT_CONTENT_UPDATE","APP_SETTINGS_UPDATE","UNIT_SAVE","UNIT_IMAGE_ADD","APARTMENTS_GENERATE","APARTMENT_STATUS"]);
export const requestSaveVerification=createServerFn({method:"POST"}).middleware([requireMysqlAuth])
 .validator((d:{action:string;payload:any})=>d)
 .handler(async({data,context})=>{
   if(!permitted.has(data.action))throw new Error("Unsupported save action");
   if(!context.roles.some((r:string)=>["it","admin"].includes(r)))throw new Error("Not authorized to request this save");
   const {queryRows}=await import("./mysql.server");
   const grantKey=await hash(context.token);
   const active=await queryRows<any>("SELECT 1 FROM save_verification_grants WHERE user_id=? AND session_hash=? AND expires_at>UTC_TIMESTAMP() LIMIT 1",[context.userId,grantKey]);
   if(active.length)return {challenge_id:"",expires_in_seconds:0,verified:true};
   if(!process.env.RESEND_API_KEY)throw new Error("Email verification delivery is not configured");
   const {withTransaction}=await import("./mysql.server");
   const {makeOtp}=await import("./security.server");
   const {uuid}=await import("./db-utils.server");
   const {sendMail}=await import("./mailer.server");
   const [user]:any=await queryRows<any>(`SELECT email FROM users WHERE id=? AND active=1`,[context.userId]);
   if(!user?.email)throw new Error("Verified account email is required");
   const id=uuid(),code=makeOtp(),digest=await payloadHash(data.action,data.payload);
   await withTransaction(async conn=>{
     const [recent]:any=await conn.execute(`SELECT id FROM save_verification_challenges WHERE user_id=? AND action_key=? AND created_at>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 45 SECOND) LIMIT 1 FOR UPDATE`,[context.userId,data.action]);
     if(recent.length)throw new Error("Please wait 45 seconds before requesting another code");
     await conn.execute(`INSERT INTO save_verification_challenges(id,user_id,action_key,payload_hash,otp_hash,expires_at)
       VALUES(?,?,?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 5 MINUTE))`,[id,context.userId,data.action,digest,await hmac(id+":"+code)]);
   });
   try{await sendMail(user.email,"NOVAWORKS — confirm changes",`<p>Your one-time verification code is <strong>${code}</strong>.</p><p>It expires in 5 minutes. Only enter it for a change you initiated.</p>`);}
   catch(error){await queryRows<any>("DELETE FROM save_verification_challenges WHERE id=? AND user_id=?",[id,context.userId]);throw error;}
   return {challenge_id:id,expires_in_seconds:300,verified:false};
 });
export async function consumeSaveVerification(conn:PoolConnection,userId:string,action:string,payload:any,challengeId:string,code:string,sessionToken:string){
 const sessionHash=await hash(sessionToken);
 const [grants]:any=await conn.execute("SELECT 1 FROM save_verification_grants WHERE user_id=? AND session_hash=? AND expires_at>UTC_TIMESTAMP() LIMIT 1",[userId,sessionHash]);
 if(grants.length)return;
 if(!challengeId||!/^\d{6}$/.test(code||""))throw new Error("Email verification required before saving");
 const [found]:any=await conn.execute(`SELECT *, (expires_at>UTC_TIMESTAMP()) AS valid_now FROM save_verification_challenges
 WHERE id=? AND user_id=? AND action_key=? FOR UPDATE`,[challengeId,userId,action]);
 const r=found[0];
 if(!r||r.consumed_at||!r.valid_now||r.attempts>=5||r.payload_hash!==await payloadHash(action,payload))
   throw new Error("Verification expired or changes differ. Request a new code.");
 const expected=Buffer.from(r.otp_hash,"hex"),provided=Buffer.from(await hmac(r.id+":"+code),"hex");
 if(expected.length!==provided.length||!(await import("node:crypto")).timingSafeEqual(expected,provided)){
   // Preserve failed-attempt counter even if the calling save transaction rolls back.
   throw new Error("Incorrect verification code");
 }
 await conn.execute("UPDATE save_verification_challenges SET consumed_at=UTC_TIMESTAMP(),otp_hash=REPEAT('0',64) WHERE id=? AND consumed_at IS NULL",[r.id]);
 await conn.execute("INSERT INTO save_verification_grants(user_id,session_hash,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE)) ON DUPLICATE KEY UPDATE expires_at=VALUES(expires_at)",[userId,sessionHash]);
}
