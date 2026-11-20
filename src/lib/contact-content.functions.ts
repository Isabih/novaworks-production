import { consumeSaveVerification } from "./save-verification.server";
import { withTransaction } from "./mysql.server";
import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { rows,parseJson,audit } from "./db-utils.server";
import { queryRows } from "./mysql.server";
export type CEO={name:string;title:string;quote:string;image:string;since:string};export type TeamMember={name:string;role:string;image:string;email?:string;phone?:string};export type ContactInfo={phone:string;phone_hours:string;email:string;email_note:string;address:string;address_note:string;hours:string;hours_note:string};export type ContactContent={ceo:CEO;team:TeamMember[];info:ContactInfo};
const DEFAULTS:ContactContent={ceo:{name:"NOVAWORKS Leadership",title:"Chief Executive Officer",quote:"Where prime property meets peace of mind.",image:"https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=85",since:"Leading NOVAWORKS"},team:[],info:{phone:"+250 793 300 080",phone_hours:"Mon – Sat, 8am – 6pm",email:"info@novaworks.rw",email_note:"Replies within 24 hours",address:"Kigali, Rwanda",address_note:"NOVAWORKS",hours:"Mon – Sat",hours_note:"8:00am – 6:00pm"}};
export const getContactContent=createServerFn({method:"GET"}).handler(async():Promise<ContactContent>=>{const r=(await rows<any>(`SELECT contact_ceo,contact_team,contact_info FROM app_settings WHERE id=1`))[0];if(!r)return DEFAULTS;return{ceo:parseJson(r.contact_ceo,DEFAULTS.ceo),team:parseJson(r.contact_team,DEFAULTS.team),info:parseJson(r.contact_info,DEFAULTS.info)}});
export const updateContactContent=createServerFn({method:"POST"}).middleware([requireMysqlAuth]).validator((d:ContactContent & {verification:{challenge_id:string;code:string}})=>d).handler(async({data,context})=>{
 if(!context.roles.some((r:string)=>["it","admin"].includes(r)))throw new Error("Only IT or Admin can edit website content");
 const {verification,...payload}=data;
 if(!verification)throw new Error("Email verification required before saving");
 for(const m of payload.team){
  if(m.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email))throw new Error("Invalid staff email");
  if(m.phone&&!/^\+?[0-9 ()-]{7,25}$/.test(m.phone))throw new Error("Invalid staff phone");
 }
 await withTransaction(async conn=>{
  await consumeSaveVerification(conn,context.userId,"CONTACT_CONTENT_UPDATE",payload,verification.challenge_id,verification.code,context.token);
  await conn.execute("UPDATE app_settings SET contact_ceo=?,contact_team=?,contact_info=?,updated_by=? WHERE id=1",[JSON.stringify(payload.ceo),JSON.stringify(payload.team),JSON.stringify(payload.info),context.userId]);
  await conn.execute("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id) VALUES(?,'CONTACT_CONTENT_UPDATED','app_settings','1')",[context.userId]);
 });
 return {ok:true};
});
