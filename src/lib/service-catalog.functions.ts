import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { assertRoles, rows, audit, uuid } from "./db-utils.server";

export const listServiceCatalog=createServerFn({method:"GET"}).middleware([requireMysqlAuth]).handler(async()=>rows<any>(`SELECT * FROM service_catalog ORDER BY active DESC,name`));
export const saveServiceCatalog=createServerFn({method:"POST"}).middleware([requireMysqlAuth]).validator((d:{id?:string;name:string;description?:string;category?:string;default_priority?:string;active?:boolean})=>d).handler(async({data,context})=>{
 await assertRoles(context.userId,["it","admin"]); if(!data.name?.trim())throw new Error("Service name is required");
 const code=data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70);
 if(data.id){await rows<any>(`UPDATE service_catalog SET name=?,description=?,category=?,default_priority=?,active=? WHERE id=?`,[data.name.trim(),data.description||null,data.category||"general",data.default_priority||"medium",data.active===false?0:1,data.id]); await audit(context.userId,"SERVICE_CATALOG_UPDATED","service_catalog",data.id,null,data); return{id:data.id};}
 const id=uuid();await rows<any>(`INSERT INTO service_catalog(id,code,name,description,category,default_priority,active,created_by) VALUES(?,?,?,?,?,?,?,?)`,[id,code,data.name.trim(),data.description||null,data.category||"general",data.default_priority||"medium",data.active===false?0:1,context.userId]);await audit(context.userId,"SERVICE_CATALOG_CREATED","service_catalog",id,null,data);return{id};
});
