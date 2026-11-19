import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { assertRoles, uuid } from "./db-utils.server";
import { withTransaction, queryRows } from "./mysql.server";
import type { PoolConnection } from "mysql2/promise";

type UnitStatus="available"|"occupied"|"maintenance"|"reserved";
export function defaultPrefixFromTitle(title:string){
 const words=title.trim().split(/\s+/).filter(Boolean).slice(0,4);
 return words.map(x=>x[0]?.toUpperCase()).join("").slice(0,4)||"APT";
}
async function auditTx(conn:PoolConnection,actor:string,action:string,entity:string,id:string,oldValues:any,newValues:any){
 await conn.execute("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,old_values,new_values) VALUES(?,?,?,?,?,?)",
  [actor,action,entity,id,oldValues?JSON.stringify(oldValues):null,newValues?JSON.stringify(newValues):null]);
}

/** Caller must hold an InnoDB transaction. Prevent manual status overrides of booked or occupied units. */
export async function assertUnitStatusTransition(conn:PoolConnection,id:string,next:UnitStatus){
 const [rows]:any=await conn.execute("SELECT id,property_id,status FROM apartments WHERE id=? FOR UPDATE",[id]);
 const unit=rows[0];if(!unit)throw new Error("Unit not found");
 if(unit.status===next)return unit;
 const [tenancies]:any=await conn.execute(`SELECT id FROM tenancies WHERE apartment_id=? AND status IN('reserved','active','extension_requested')
   AND end_date>=CURRENT_DATE() LIMIT 1`,[id]);
 const [bookings]:any=await conn.execute(`SELECT id FROM bookings WHERE apartment_id=? AND status IN('pending','confirmed') LIMIT 1`,[id]);
 if(tenancies.length && next!=="occupied")throw new Error("Unit has an active or upcoming tenancy. Complete checkout first.");
 if(bookings.length && (next==="available"||next==="maintenance"))throw new Error("Unit has a pending or confirmed booking. Resolve it first.");
 if(next==="occupied"&&!tenancies.length)throw new Error("Occupied status must come from a confirmed tenancy.");
 if(next==="reserved"&&!bookings.length)throw new Error("Reserved status must come from a booking.");
 return unit;
}

export const generateApartmentsForProperty=createServerFn({method:"POST"})
 .middleware([requireMysqlAuth]).validator((d:{property_id:string;count:number;prefix:string})=>d)
 .handler(async({data,context})=>{
  await assertRoles(context.userId,["it","admin"]);
  if(!Number.isSafeInteger(data.count)||data.count<1||data.count>500)throw new Error("Count must be 1–500");
  const requestedPrefix=String(data.prefix||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6)||"APT";
  let added=0;
  await withTransaction(async conn=>{
    const [properties]:any=await conn.execute("SELECT id,unit_code_prefix FROM properties WHERE id=? FOR UPDATE",[data.property_id]);
    const property=properties[0];if(!property)throw new Error("Property not found");
    const [existing]:any=await conn.execute("SELECT id,code FROM apartments WHERE property_id=? FOR UPDATE",[data.property_id]);
    if(data.count<existing.length)throw new Error("Reducing unit count cannot delete units. Manage existing units individually.");
    const prefix=String(property.unit_code_prefix||requestedPrefix);
    if(existing.length&&property.unit_code_prefix&&requestedPrefix!==prefix)throw new Error("Unit prefix is immutable after units exist");
    const codes=new Set<string>(existing.map((x:any)=>String(x.code).toUpperCase()));
    let next=1;
    while(existing.length+added<data.count){
      const code=`${prefix}-${String(next++).padStart(3,"0")}`;
      if(codes.has(code))continue;
      codes.add(code);
      await conn.execute("INSERT INTO apartments(id,property_id,code,status) VALUES(?,?,?,'available')",[uuid(),data.property_id,code]);
      added++;
    }
    await conn.execute("UPDATE properties SET unit_count=?,unit_code_prefix=? WHERE id=?",[existing.length+added,prefix,data.property_id]);
    await auditTx(conn,context.userId,"APARTMENTS_EXPANDED","property",data.property_id,null,{previous:existing.length,added,total:existing.length+added,prefix});
  });
  return {ok:true,created:added};
 });

export const listApartmentsByProperty=createServerFn({method:"GET"})
 .middleware([requireMysqlAuth]).validator((d:{property_id:string;only_available?:boolean})=>d)
 .handler(async({data})=>queryRows<any[]>(`SELECT * FROM ${data.only_available?"available_apartments":"apartments"} WHERE property_id=? ORDER BY code`,[data.property_id]));

export const updateApartmentStatus=createServerFn({method:"POST"})
 .middleware([requireMysqlAuth]).validator((d:{id:string;status:UnitStatus})=>d)
 .handler(async({data,context})=>{
  await assertRoles(context.userId,["it","admin","receptionist"]);
  if(!["available","occupied","maintenance","reserved"].includes(data.status))throw new Error("Invalid status");
  await withTransaction(async conn=>{
    const existing=await assertUnitStatusTransition(conn,data.id,data.status);
    await conn.execute("UPDATE apartments SET status=? WHERE id=?",[data.status,data.id]);
    await auditTx(conn,context.userId,"APARTMENT_STATUS_CHANGED","apartment",data.id,{status:existing.status},{status:data.status});
  });
  return {ok:true};
 });
