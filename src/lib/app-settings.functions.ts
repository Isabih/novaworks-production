import { consumeSaveVerification } from "./save-verification.server";
import { withTransaction } from "./mysql.server";
import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { rows,audit } from "./db-utils.server";
import { queryRows } from "./mysql.server";
export const getAppSettings=createServerFn({method:"GET"}).middleware([requireMysqlAuth]).handler(async()=>{return (await rows<any>(`SELECT * FROM app_settings WHERE id=1`))[0]??null});
export const updateAppSettings=createServerFn({method:"POST"}).middleware([requireMysqlAuth])
.validator((d:any)=>d).handler(async({data,context})=>{
 if(!context.roles.includes("it"))throw new Error("Only IT can change system communication settings");
 const {verification,...payload}=data;
 if(!verification)throw new Error("Email verification required before saving");
 const allowed=["sender_name","from_email","reply_to","signature","brand_color","site_url","sr_confirm_subject","sr_confirm_body","sr_urgent_label","sr_normal_label","sr_reply_subject","sms_enabled","sms_mode"];
 const keys=Object.keys(payload).filter(k=>allowed.includes(k));
 if(!keys.length)throw new Error("No valid changes supplied");
 await withTransaction(async conn=>{
  await consumeSaveVerification(conn,context.userId,"APP_SETTINGS_UPDATE",payload,verification.challenge_id,verification.code,context.token);
  await conn.execute(`UPDATE app_settings SET ${keys.map(k=>`${k}=?`).join(",")},updated_by=? WHERE id=1`,[...keys.map(k=>payload[k]),context.userId]);
  await conn.execute("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,new_values) VALUES(?,'SETTINGS_UPDATED','app_settings','1',?)",
    [context.userId,JSON.stringify({changed_fields:keys})]);
 });
 return{ok:true};
});
