import mysql from "mysql2/promise";
import {setTimeout as sleep} from "node:timers/promises";

const required=["DB_HOST","DB_USER","DB_NAME"];
for(const k of required)if(!process.env[k])throw new Error(`${k} is required`);
const pool=mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD||"",database:process.env.DB_NAME,waitForConnections:true,connectionLimit:3,timezone:"Z"});
const workerId=process.pid;
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function claim(){
 const c=await pool.getConnection();
 try{
  await c.beginTransaction();
  const [rows]=await c.query(`SELECT * FROM listing_email_outbox WHERE (status IN('pending','failed') AND next_attempt_at<=UTC_TIMESTAMP()) OR (status='sending' AND locked_until<UTC_TIMESTAMP()) ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED`);
  for(const r of rows)await c.execute(`UPDATE listing_email_outbox SET status='sending',attempts=attempts+1,locked_until=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 5 MINUTE) WHERE id=?`,[r.id]);
  await c.commit();return rows;
 }catch(e){await c.rollback();throw e}finally{c.release()}
}
async function send(row){
 const key=process.env.RESEND_API_KEY;
 if(!key)throw new Error("RESEND_API_KEY is not configured");
 const from=process.env.RESEND_FROM||process.env.RESEND_FROM_EMAIL||"no-reply@novaworks.rw";
 const reply=process.env.RESEND_REPLY_TO||process.env.NOVAWORKS_CONTACT_EMAIL||"info@novaworks.rw";
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json","Idempotency-Key":row.id},body:JSON.stringify({from:from.includes("<")?from:`NOVAWORKS <${from}>`,to:[row.recipient],subject:row.subject,html:row.body_html,reply_to:reply})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.message||`Email provider HTTP ${response.status}`);
 return data.id||null;
}
async function deliver(row){
 try{
  const providerId=await send(row);
  await pool.execute(`UPDATE listing_email_outbox SET status='sent',sent_at=UTC_TIMESTAMP(),locked_until=NULL,provider_id=?,last_error=NULL WHERE id=?`,[providerId,row.id]);
  await pool.execute(`INSERT INTO email_log(id,to_email,subject,kind,status) VALUES(UUID(),?,?,?,'sent')`,[row.recipient,row.subject,"listing_"+row.kind]);
  if(row.kind==="acknowledgement")await pool.execute(`UPDATE property_listing_requests SET acknowledgement_sent_at=UTC_TIMESTAMP(),acknowledgement_error=NULL WHERE id=?`,[row.listing_id]);
 }catch(e){
  const message=String(e?.message||e).slice(0,2000);
  const delay=Math.min(3600,Math.pow(2,Math.min(10,Number(row.attempts||0)))*30);
  await pool.execute(`UPDATE listing_email_outbox SET status='failed',locked_until=NULL,last_error=?,next_attempt_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? SECOND) WHERE id=?`,[message,delay,row.id]);
  await pool.execute(`INSERT INTO email_log(id,to_email,subject,kind,status,error) VALUES(UUID(),?,?,?,'failed',?)`,[row.recipient,row.subject,"listing_"+row.kind,message]);
  if(row.kind==="acknowledgement")await pool.execute(`UPDATE property_listing_requests SET acknowledgement_error=? WHERE id=?`,[message,row.listing_id]);
  console.error("[listing-mail]",row.id,message);
 }
}
async function reminders(){
 const [requests]=await pool.query(`SELECT id,reference,title,full_name,email,phone FROM property_listing_requests WHERE status IN('pending','in_review') AND applicant_contacted_at IS NULL AND created_at<DATE_SUB(UTC_TIMESTAMP(),INTERVAL 18 HOUR) AND created_at>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 30 DAY)`);
 const [managers]=await pool.query(`SELECT DISTINCT u.id,COALESCE(NULLIF(u.business_email,''),u.email) email FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.active=1 AND r.role IN('it','admin')`);
 for(const r of requests)for(const m of managers){
  const subject=`Listing follow-up due — ${r.reference}`;
  const html=`<h2>NOVAWORKS listing follow-up</h2><p>Reference: ${escapeHtml(r.reference)}</p><p>${escapeHtml(r.title)}</p><p>Applicant: ${escapeHtml(r.full_name)}<br/>${escapeHtml(r.email)}<br/>${escapeHtml(r.phone)}</p><p>The 24-hour response deadline is approaching or overdue. Please contact the applicant and record the outcome.</p><p><a href="https://novaworks.rw/dashboard/admin/listing-requests">Open review queue</a></p>`;
  await pool.execute(`INSERT INTO listing_email_outbox(id,listing_id,recipient,kind,subject,body_html) VALUES(UUID(),?,?,'sla_reminder',?,?) ON DUPLICATE KEY UPDATE id=id`,[r.id,m.email,subject,html]);
 }
}
let stopping=false;
process.on("SIGTERM",()=>{stopping=true});
process.on("SIGINT",()=>{stopping=true});
try{
 while(!stopping){
  try{
   await reminders();
   const batch=await claim();
   for(const row of batch)await deliver(row);
  }catch(e){console.error("[listing-mail-worker]",e)}
  if(!stopping)await sleep(60000);
 }
}finally{await pool.end()}
