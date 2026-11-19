import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { rows,assertRoles,parseJson } from "./db-utils.server";
const redact=(value:any):any=>{
 if(Array.isArray(value))return value.map(redact);
 if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,/password|token|secret|otp|authorization|api.?key|cookie|credential/i.test(k)?"[REDACTED]":redact(v)]));
 return value;
};
export const listAuditLogs=createServerFn({method:"GET"}).middleware([requireMysqlAuth])
 .validator((d?:{q?:string;user_id?:string;before_id?:number;limit?:number})=>d||{})
 .handler(async({data,context})=>{
   await assertRoles(context.userId,["it"]);
   const q=String(data.q||"").trim().slice(0,100);
   const userId=String(data.user_id||"").trim();
   const beforeId=Math.max(0,Number(data.before_id)||0);
   const limit=Math.min(200,Math.max(1,Number(data.limit)||100));
   const rs=await rows<any>(`SELECT a.*,u.full_name actor_name,u.email actor_email FROM audit_logs a
    LEFT JOIN users u ON u.id=a.actor_user_id
    WHERE (?='' OR a.action LIKE CONCAT('%',?,'%') OR a.entity_type LIKE CONCAT('%',?,'%') OR u.full_name LIKE CONCAT('%',?,'%') OR u.email LIKE CONCAT('%',?,'%'))
    AND (?='' OR a.actor_user_id=?)
    AND (?=0 OR a.id<?)
    ORDER BY a.id DESC LIMIT ?`,[q,q,q,q,q,userId,userId,beforeId,beforeId,limit]);
   return rs.map(r=>({...r,old_values:redact(parseJson(r.old_values,null)),new_values:redact(parseJson(r.new_values,null))}));
 });
