import { randomUUID } from "node:crypto";
import { queryRows } from "./mysql.server";
export type SmsMode="relay"|"device";

export async function sendSms(to:string,message:string,mode:SmsMode=(process.env.SMS_DEFAULT_MODE as SmsMode)||"device",kind="general"){
  const base=(process.env.SMS_API_BASE_URL||"").replace(/\/$/,"");
  const key=process.env.SMS_API_KEY||"";
  if(!base||!key) throw new Error("SMS API is not configured. Set SMS_API_BASE_URL and SMS_API_KEY in .env");
  const path=mode==="relay"?(process.env.SMS_RELAY_PATH||"/api/public/v1/sms/relay/send"):(process.env.SMS_DEVICE_PATH||"/api/public/v1/sms/device/send");
  const endpoint=`${base}${path.startsWith("/")?path:`/${path}`}`;
  let r: Response;
  try {
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),Number(process.env.SMS_TIMEOUT_MS||15000));
    r=await fetch(endpoint,{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({to,message}),signal:controller.signal});
    clearTimeout(timer);
  } catch (networkError:any) {
    const err:any=new Error(`SMS network error: ${networkError?.message||"connection failed"}`);
    err.endpoint=endpoint;
    throw err;
  }
  const raw=await r.text();
  let payload:any;
  try{payload=raw?JSON.parse(raw):{}}catch{payload={raw}}
  try{await queryRows<any>(`INSERT INTO sms_log(id,to_phone,kind,status,response_json) VALUES(?,?,?,?,?)`,[randomUUID(),to,kind,r.ok?"sent":"failed",JSON.stringify({httpStatus:r.status,endpoint,payload})])}catch(logError){console.error("[sms] could not write sms_log",logError)}
  if(!r.ok){const err:any=new Error(`SMS Hub returned HTTP ${r.status}${payload?.message?`: ${payload.message}`:""}`);err.providerStatus=r.status;err.providerPayload=payload;err.endpoint=endpoint;throw err}
  return { httpStatus:r.status, endpoint, payload };
}

export async function checkSmsHealth(){
  const base=(process.env.SMS_API_BASE_URL||"").replace(/\/$/,"");const key=process.env.SMS_API_KEY||"";
  if(!base||!key)return{ok:false,detail:"SMS_API_BASE_URL / SMS_API_KEY missing"};
  return {ok:true,detail:`Configured • ${base} • ${process.env.SMS_DEFAULT_MODE||"device"}`};
}
