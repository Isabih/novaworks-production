import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { assertRoles, rows } from "./db-utils.server";

const dateWhere=(from?:string,to?:string,field="created_at")=>({
  sql:`${from?` AND ${field}>=?`:""}${to?` AND ${field}<DATE_ADD(?,INTERVAL 1 DAY)`:""}`,
  params:[...(from?[from]:[]),...(to?[to]:[])],
});

export const getAdminReport=createServerFn({method:"POST"}).middleware([requireMysqlAuth]).validator((d:{from?:string;to?:string;property_id?:string})=>d).handler(async({data,context})=>{
  await assertRoles(context.userId,["it","admin"]);
  const dw=dateWhere(data.from,data.to,"b.created_at");
  const prop=data.property_id?" AND b.property_id=?":"";
  const params=[...dw.params,...(data.property_id?[data.property_id]:[])];
  const bookings=await rows<any>(`SELECT b.id,b.created_at,b.status,b.payment_status,b.payment_method,b.amount,b.currency,b.check_in,b.check_out,b.full_name customer,p.title property_title,a.code unit_code FROM bookings b JOIN properties p ON p.id=b.property_id LEFT JOIN apartments a ON a.id=b.apartment_id WHERE 1=1 ${dw.sql}${prop} ORDER BY b.created_at DESC`,params);
  const ledger=await rows<any>(`SELECT ol.*,p.title property_title,u.full_name owner_name FROM owner_ledger ol JOIN properties p ON p.id=ol.property_id JOIN users u ON u.id=ol.owner_id WHERE 1=1 ${data.from?" AND ol.created_at>=?":""}${data.to?" AND ol.created_at<DATE_ADD(?,INTERVAL 1 DAY)":""}${data.property_id?" AND ol.property_id=?":""} ORDER BY ol.created_at DESC`,params);
  const summary=await rows<any>(`SELECT currency,
    SUM(CASE WHEN direction='credit' THEN amount ELSE 0 END) gross,
    SUM(CASE WHEN entry_type='commission' THEN amount ELSE 0 END) commission,
    SUM(CASE WHEN entry_type='maintenance' THEN amount ELSE 0 END) maintenance,
    SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END) owner_net
    FROM owner_ledger ol WHERE 1=1 ${data.from?" AND ol.created_at>=?":""}${data.to?" AND ol.created_at<DATE_ADD(?,INTERVAL 1 DAY)":""}${data.property_id?" AND ol.property_id=?":""} GROUP BY currency`,params);
  const properties=await rows<any>(`SELECT id,title FROM properties ORDER BY title`);
  return {bookings,ledger,summary,properties};
});

export const getOwnerReport=createServerFn({method:"POST"}).middleware([requireMysqlAuth]).validator((d:{from?:string;to?:string;property_id?:string})=>d).handler(async({data,context})=>{
  await assertRoles(context.userId,["owner"]);
  const props=await rows<any>(`SELECT id,title,currency FROM properties WHERE owner_id=? ORDER BY title`,[context.userId]);
  if(data.property_id && !props.some((p:any)=>p.id===data.property_id)) throw new Error("Property not found");
  const filters=`${data.from?" AND created_at>=?":""}${data.to?" AND created_at<DATE_ADD(?,INTERVAL 1 DAY)":""}${data.property_id?" AND property_id=?":""}`;
  const params=[context.userId,...(data.from?[data.from]:[]),...(data.to?[data.to]:[]),...(data.property_id?[data.property_id]:[])];
  const ledger=await rows<any>(`SELECT ol.*,p.title property_title FROM owner_ledger ol JOIN properties p ON p.id=ol.property_id WHERE ol.owner_id=? ${filters.replaceAll("created_at","ol.created_at").replaceAll("property_id","ol.property_id")} ORDER BY ol.created_at DESC`,params);
  const summary=await rows<any>(`SELECT currency,
    SUM(CASE WHEN entry_type='rent_income' THEN amount ELSE 0 END) gross_rent,
    SUM(CASE WHEN entry_type='commission' THEN amount ELSE 0 END) commission,
    SUM(CASE WHEN entry_type='maintenance' THEN amount ELSE 0 END) maintenance,
    SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END) net_profit
    FROM owner_ledger WHERE owner_id=? ${filters} GROUP BY currency`,params);
  return {properties:props,ledger,summary};
});

export const getOwnerBookings=createServerFn({method:"GET"}).middleware([requireMysqlAuth]).handler(async({context})=>{
 await assertRoles(context.userId,["owner"]);
 return rows<any>(`SELECT b.*,p.title property_title,a.code unit_code FROM bookings b JOIN properties p ON p.id=b.property_id LEFT JOIN apartments a ON a.id=b.apartment_id WHERE p.owner_id=? ORDER BY b.created_at DESC LIMIT 300`,[context.userId]);
});

export const getOwnerServiceRequests=createServerFn({method:"GET"}).middleware([requireMysqlAuth]).handler(async({context})=>{
 await assertRoles(context.userId,["owner"]);
 return rows<any>(`SELECT sr.*,p.title property_title,a.code unit_code,c.full_name customer_name,(SELECT COALESCE(SUM(si.quantity*si.unit_price),0) FROM service_items si WHERE si.service_request_id=sr.id AND si.owner_chargeable=1) owner_cost FROM service_requests sr JOIN properties p ON p.id=sr.property_id LEFT JOIN apartments a ON a.id=sr.apartment_id JOIN customers c ON c.id=sr.customer_id WHERE p.owner_id=? ORDER BY sr.requested_at DESC LIMIT 300`,[context.userId]);
});
