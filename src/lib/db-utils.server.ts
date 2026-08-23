import type { RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { queryRows } from "./mysql.server";
import type { DbRole } from "./auth.server";

export { randomUUID as uuid };
export async function rows<T=any>(sql:string,params:unknown[]=[]){return queryRows<(RowDataPacket&T)[]>(sql,params)}
export async function rolesFor(userId:string){const r=await rows<{role:DbRole}>(`SELECT role FROM user_roles WHERE user_id=?`,[userId]);return r.map(x=>x.role)}
export async function assertRoles(userId:string, allowed:DbRole[]){const rs=await rolesFor(userId);if(!rs.some(r=>allowed.includes(r)))throw new Error("You do not have permission to perform this action");return rs}
export async function audit(actor:string|null,action:string,entityType:string,entityId?:string|null,oldValues?:any,newValues?:any){await queryRows<any>(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,old_values,new_values) VALUES(?,?,?,?,?,?)`,[actor,action,entityType,entityId??null,oldValues?JSON.stringify(oldValues):null,newValues?JSON.stringify(newValues):null])}
export function parseJson<T>(v:any,fallback:T):T{if(v==null)return fallback;if(typeof v!=="string")return v as T;try{return JSON.parse(v) as T}catch{return fallback}}
export function sqlDate(v:any){if(!v)return null;if(typeof v==='string')return v.slice(0,10);return new Date(v).toISOString().slice(0,10)}

export async function requireFeature(key:string){
  const r=(await rows<any>(`SELECT enabled FROM feature_flags WHERE feature_key=? LIMIT 1`,[key]))[0];
  if(r && !Boolean(r.enabled)) throw new Error(`${key.replace(/_/g," ")} is temporarily disabled by IT`);
}
