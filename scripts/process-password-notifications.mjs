// Run via cron/systemd every minute: node scripts/process-password-notifications.mjs
import crypto from "node:crypto";
import mysql from "mysql2/promise";
const secret=process.env.NOVAWORKS_SECURITY_SECRET;
if(!secret||secret.length<32||!process.env.RESEND_API_KEY) throw new Error("Password notification worker configuration missing");
const key=crypto.createHash("sha256").update(secret).digest();
const decrypt=(value)=>{
 const buf=Buffer.from(value,"base64"),iv=buf.subarray(0,12),tag=buf.subarray(12,28);
 const decipher=crypto.createDecipheriv("aes-256-gcm",key,iv);decipher.setAuthTag(tag);
 return Buffer.concat([decipher.update(buf.subarray(28)),decipher.final()]).toString("utf8");
};
const db=await mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,connectionLimit:3});
async function processOne(){
 const conn=await db.getConnection();let item;
 try{
  await conn.beginTransaction();
  const [rows]=await conn.query(`SELECT * FROM password_notification_outbox
    WHERE (status='pending' AND next_attempt_at<=UTC_TIMESTAMP())
       OR (status='sending' AND claimed_at<DATE_SUB(UTC_TIMESTAMP(),INTERVAL 5 MINUTE))
    ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`);
  if(!rows.length){await conn.commit();return false}
  item=rows[0];
  await conn.execute("UPDATE password_notification_outbox SET status='sending',claimed_at=UTC_TIMESTAMP(),attempts=attempts+1 WHERE id=?",[item.id]);
  await conn.commit();
 }catch(e){await conn.rollback();throw e}finally{conn.release()}
 try{
  const from=process.env.RESEND_FROM||process.env.RESEND_FROM_EMAIL;
  if(!from) throw new Error("RESEND_FROM missing");
  const response=await fetch("https://api.resend.com/emails",{
   method:"POST",headers:{"Authorization":`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":item.id},
   body:JSON.stringify({from,to:JSON.parse(decrypt(item.recipient_ciphertext)),subject:decrypt(item.subject_ciphertext),html:decrypt(item.body_ciphertext)})
  });
  if(!response.ok) throw new Error(`Email provider returned ${response.status}`);
  await db.execute("UPDATE password_notification_outbox SET status='sent',sent_at=UTC_TIMESTAMP(),last_error=NULL WHERE id=?",[item.id]);
 }catch(e){
  const attempt=Number(item.attempts)+1;
  const wait=Math.min(3600,60*2**Math.min(attempt,6));
  await db.execute(`UPDATE password_notification_outbox SET status=?,next_attempt_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? SECOND),last_error=? WHERE id=?`,
   [attempt>=10?"failed":"pending",wait,String(e?.message||e).slice(0,500),item.id]);
 }
 return true;
}
try{for(let i=0;i<50;i++){if(!await processOne())break}}finally{await db.end()}
