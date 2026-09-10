import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { rows, audit } from "./db-utils.server";
import { queryRows } from "./mysql.server";
export type PopupPlacement="bottom-right"|"bottom-left"|"top-right"|"top-left";
export type PopupMedia={property_id:string;video_url?:string|null;image_url?:string|null};
export type PopupSettings={enabled:boolean;cycle_ms:number;visible_ms:number;max_items:number;property_ids:string[];site_enabled:boolean;hero_enabled:boolean;site_position:PopupPlacement;hero_position:"left"|"right";media:PopupMedia[]};
export const POPUP_DEFAULTS:PopupSettings={enabled:true,cycle_ms:24000,visible_ms:9000,max_items:6,property_ids:[],site_enabled:true,hero_enabled:true,site_position:"bottom-right",hero_position:"right",media:[]};
function safe(raw:any):PopupSettings{const x=typeof raw==='string'?(()=>{try{return JSON.parse(raw)}catch{return {}}})():raw||{};return{...POPUP_DEFAULTS,...x,property_ids:Array.isArray(x.property_ids)?x.property_ids.slice(0,24):[],media:Array.isArray(x.media)?x.media.slice(0,24):[]}}
export const getPopupSettings=createServerFn({method:"GET"}).handler(async()=>{const r=(await rows<any>(`SELECT popup_settings FROM app_settings WHERE id=1`))[0];return safe(r?.popup_settings)});
export const updatePopupSettings=createServerFn({method:"POST"}).middleware([requireMysqlAuth]).validator((d:any)=>d).handler(async({data,context})=>{if(!context.roles.some((r:string)=>["it","admin"].includes(r)))throw new Error("Only IT or Admin can change popup settings");const v=safe(data);v.cycle_ms=Math.max(6000,Math.min(300000,Number(v.cycle_ms)||24000));v.visible_ms=Math.max(3000,Math.min(60000,Number(v.visible_ms)||9000));v.max_items=Math.max(1,Math.min(24,Number(v.max_items)||6));await queryRows<any>(`UPDATE app_settings SET popup_settings=?,updated_by=? WHERE id=1`,[JSON.stringify(v),context.userId]);await audit(context.userId,"POPUP_SETTINGS_UPDATED","app_settings","1",null,v);return{ok:true}});
