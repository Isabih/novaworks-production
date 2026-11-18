import { createCipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolConnection } from "mysql2/promise";

function encrypt(value:string) {
  const secret=process.env.NOVAWORKS_SECURITY_SECRET;
  if(!secret || secret.length<32) throw new Error("NOVAWORKS_SECURITY_SECRET required");
  const key=createHash("sha256").update(secret).digest();
  const iv=randomBytes(12);
  const cipher=createCipheriv("aes-256-gcm",key,iv);
  const encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString("base64");
}
export async function queuePasswordEmail(conn:PoolConnection,requestId:string,to:string|string[],subject:string,html:string) {
  if(!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY required");
  const recipients=Array.isArray(to)?to:[to];
  if(!recipients.length||recipients.some(x=>!/^\S+@\S+\.\S+$/.test(x))) throw new Error("Valid notification recipients required");
  await conn.execute(`INSERT INTO password_notification_outbox
    (id,request_id,recipient_ciphertext,subject_ciphertext,body_ciphertext)
    VALUES(?,?,?,?,?)`,[randomUUID(),requestId,encrypt(JSON.stringify(recipients)),encrypt(subject),encrypt(html)]);
}
export function itRecipients(){
  const recipients=(process.env.NOVAWORKS_IT_ALERT_EMAILS||"").split(",").map(x=>x.trim()).filter(Boolean);
  if(!recipients.length) throw new Error("NOVAWORKS_IT_ALERT_EMAILS required");
  return recipients;
}
