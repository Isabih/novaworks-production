import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { assertRoles, rows, uuid } from "./db-utils.server";
import { withTransaction } from "./mysql.server";
import { assertUnitStatusTransition } from "./apartments.functions";

export const listUnitsForManagement=createServerFn({method:"POST"}).middleware([requireMysqlAuth])
 .validator((d:{property_id:string})=>d)
 .handler(async({data,context})=>{
  await assertRoles(context.userId,["it","admin"]);
  return rows<any>(`SELECT a.*,(SELECT JSON_ARRAYAGG(JSON_OBJECT('id',i.id,'url',i.url,'position',i.position,'is_cover',i.is_cover))
   FROM apartment_images i WHERE i.apartment_id=a.id) images_json
   FROM apartments a WHERE a.property_id=? ORDER BY a.floor,a.code`,[data.property_id]);
 });

export const saveUnit=createServerFn({method:"POST"}).middleware([requireMysqlAuth])
 .validator((d:any)=>d).handler(async({data,context})=>{
  await assertRoles(context.userId,["it","admin"]);
  const id=data.id||uuid(), code=String(data.code||"").trim().toUpperCase();
  if(!data.property_id||!code||code.length>80)throw new Error("Valid unit code and property required");
  const validStatus=["available","occupied","maintenance","reserved"];
  if(data.status&&!validStatus.includes(data.status))throw new Error("Invalid unit status");
  const money=data.monthly_price===null||data.monthly_price===""||data.monthly_price===undefined?null:Number(data.monthly_price);
  if(money!==null&&(!Number.isFinite(money)||money<0))throw new Error("Monthly price must be nonnegative");
  const numberField=(x:any)=>x===""||x===null||x===undefined?null:Number(x);
  await withTransaction(async conn=>{
    if(data.id){
      const previous=await assertUnitStatusTransition(conn,id,data.status||"available");
      if(previous.property_id!==data.property_id)throw new Error("Cannot move a unit to another property");
      await conn.execute(`UPDATE apartments SET code=?,name=?,unit_type=?,floor=?,bedrooms=?,bathrooms=?,area_sqm=?,monthly_price=?,status=?,notes=? WHERE id=?`,
       [code,data.name||null,data.unit_type||"apartment",numberField(data.floor),numberField(data.bedrooms),numberField(data.bathrooms),
        numberField(data.area_sqm),money,data.status||"available",data.notes||null,id]);
      await conn.execute("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,old_values,new_values) VALUES(?,'UNIT_UPDATED','apartment',?,?,?)",
       [context.userId,id,JSON.stringify(previous),JSON.stringify({code,status:data.status||"available",monthly_price:money})]);
    }else{
      if(data.status&&data.status!=="available")throw new Error("New units must start available");
      const [properties]:any=await conn.execute("SELECT id FROM properties WHERE id=? FOR UPDATE",[data.property_id]);
      if(!properties.length)throw new Error("Property not found");
      await conn.execute(`INSERT INTO apartments(id,property_id,code,name,unit_type,floor,bedrooms,bathrooms,area_sqm,monthly_price,status,notes)
         VALUES(?,?,?,?,?,?,?,?,?,?,'available',?)`,
       [id,data.property_id,code,data.name||null,data.unit_type||"apartment",numberField(data.floor),numberField(data.bedrooms),
        numberField(data.bathrooms),numberField(data.area_sqm),money,data.notes||null]);
      await conn.execute("UPDATE properties SET unit_count=(SELECT COUNT(*) FROM apartments WHERE property_id=?) WHERE id=?",[data.property_id,data.property_id]);
      await conn.execute("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,new_values) VALUES(?,'UNIT_CREATED','apartment',?,?)",
       [context.userId,id,JSON.stringify({property_id:data.property_id,code})]);
    }
  });
  return{id};
 });

export const addUnitImage=createServerFn({method:"POST"}).middleware([requireMysqlAuth])
 .validator((d:{apartment_id:string;url:string;storage_path?:string;is_cover?:boolean})=>d)
 .handler(async({data,context})=>{
  await assertRoles(context.userId,["it","admin"]);
  if(!/^https:\/\//.test(data.url))throw new Error("Unit image must use HTTPS");
  const id=uuid();
  await withTransaction(async conn=>{
    const [units]:any=await conn.execute("SELECT id FROM apartments WHERE id=? FOR UPDATE",[data.apartment_id]);
    if(!units.length)throw new Error("Unit not found");
    if(data.is_cover)await conn.execute("UPDATE apartment_images SET is_cover=0 WHERE apartment_id=?",[data.apartment_id]);
    const [existing]:any=await conn.execute("SELECT COALESCE(MAX(position),-1)+1 AS next_position FROM apartment_images WHERE apartment_id=?",[data.apartment_id]);
    await conn.execute("INSERT INTO apartment_images(id,apartment_id,url,storage_path,is_cover,position) VALUES(?,?,?,?,?,?)",
      [id,data.apartment_id,data.url,data.storage_path||null,data.is_cover?1:0,existing[0].next_position]);
    await conn.execute("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,new_values) VALUES(?,'UNIT_IMAGE_ADDED','apartment',?,?)",
      [context.userId,data.apartment_id,JSON.stringify({image_id:id})]);
  });
  return {id};
 });
