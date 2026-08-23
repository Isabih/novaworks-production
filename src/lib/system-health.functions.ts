import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { assertRoles, rows, audit } from "./db-utils.server";
import { getDb } from "./mysql.server";
import { checkSmsHealth } from "./sms.server";
import { AwsClient } from "aws4fetch";

export const getSystemHealth=createServerFn({method:"GET"}).middleware([requireMysqlAuth]).handler(async({context})=>{
 await assertRoles(context.userId,["it"]);
 let mysql={ok:false,detail:"Unavailable"};try{const db=await getDb();await db.query("SELECT 1");const [c]=await rows<any>(`SELECT (SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM properties) properties`);mysql={ok:true,detail:`${c.users} users • ${c.properties} properties`}}catch(e:any){mysql={ok:false,detail:e.message}}
 let sms:any={ok:false,detail:"Not configured"};try{const h=await checkSmsHealth();sms={ok:h.ok,detail:h.detail}}catch(e:any){sms={ok:false,detail:e.message}}
 let ai:any={ok:false,detail:"OPENAI_API_KEY missing"};const aiKey=(process.env.OPENAI_API_KEY||"").trim();if(aiKey&&aiKey!=="CHANGE_ME"){try{const model=(process.env.OPENAI_MODEL||"gpt-5.6-luna").trim();const c=new AbortController();const t=setTimeout(()=>c.abort(),8000);const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${aiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model,input:"Reply only with OK",max_output_tokens:32}),signal:c.signal});const j:any=await r.json().catch(()=>({}));clearTimeout(t);ai={ok:r.ok,detail:r.ok?`OpenAI generation ready • ${model}`:`OpenAI ${r.status}: ${j?.error?.message||"generation failed"}`}}catch(e:any){ai={ok:false,detail:e?.name==="AbortError"?"OpenAI generation health check timed out":e?.message||"OpenAI connection failed"}}}
 let email:any={ok:false,detail:"RESEND_API_KEY missing"};
 const resendKey=(process.env.RESEND_API_KEY||"").trim();
 if(resendKey&&resendKey!=="CHANGE_ME"){
   try{
     const r=await fetch("https://api.resend.com/domains",{headers:{Authorization:`Bearer ${resendKey}`}});
     const j:any=await r.json().catch(()=>({}));
     email={ok:r.ok,detail:r.ok?`Resend API ready • inbound ${process.env.RESEND_WEBHOOK_SECRET?"signed webhook configured":"webhook secret missing"}`:`Resend ${r.status}: ${j?.message||"API check failed"}`};
   }catch(e:any){email={ok:false,detail:e?.message||"Resend connection failed"}}
 }
 let media:any={ok:false,detail:"R2 credentials incomplete"};
 const r2Account=(process.env.R2_ACCOUNT_ID||"").trim(),r2Access=(process.env.R2_ACCESS_KEY_ID||"").trim(),r2Secret=(process.env.R2_SECRET_ACCESS_KEY||"").trim(),r2Bucket=(process.env.R2_BUCKET||"").trim();
 if(r2Account&&r2Access&&r2Secret&&r2Bucket){
   try{
     const base=(process.env.R2_ENDPOINT||`https://${r2Account}.r2.cloudflarestorage.com`).replace(/\/+$/,"");
     const client=new AwsClient({accessKeyId:r2Access,secretAccessKey:r2Secret,service:"s3",region:"auto"});
     const signed=await client.sign(new Request(`${base}/${r2Bucket}?list-type=2&max-keys=1`,{method:"GET"}));
     const r=await fetch(signed);
     media={ok:r.ok,detail:r.ok?`Cloudflare R2 ready • ${r2Bucket}`:`R2 ${r.status}: connection/authentication failed`};
   }catch(e:any){media={ok:false,detail:e?.message||"R2 connection failed"}}
 }
 return {mysql,authentication:{ok:true,detail:"MySQL session authentication"},ai,email,media,nida:{ok:!!(process.env.NIDA_API_URL&&process.env.NIDA_USERNAME&&process.env.NIDA_PASSWORD),detail:process.env.NIDA_API_URL?"NIDA credentials configured":"NIDA credentials incomplete"},sms};
});
export const listFeatureFlags=createServerFn({method:"GET"}).middleware([requireMysqlAuth]).handler(async({context})=>{await assertRoles(context.userId,["it"]);return rows<any>(`SELECT feature_key,label,enabled,updated_at FROM feature_flags ORDER BY label`)});
export const setFeatureFlag=createServerFn({method:"POST"}).middleware([requireMysqlAuth]).validator((d:{key:string;enabled:boolean})=>d).handler(async({data,context})=>{await assertRoles(context.userId,["it"]);await rows<any>(`UPDATE feature_flags SET enabled=?,updated_by=?,updated_at=UTC_TIMESTAMP() WHERE feature_key=?`,[data.enabled?1:0,context.userId,data.key]);await audit(context.userId,"FEATURE_TOGGLED","feature_flag",data.key,null,{enabled:data.enabled});return{ok:true}});
