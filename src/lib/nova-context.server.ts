import type { SessionUser } from "./auth.server";
import { queryRows } from "./mysql.server";

export async function getNovaContext(user:SessionUser|null){
 if(!user)return {authenticated:false,scope:"public"};
 const base:any={authenticated:true,user:{id:user.id,name:user.full_name,email:user.email,roles:user.roles}};
 if(user.roles.includes("customer")){
   const [customers]=await queryRows<any[]>(`SELECT id,full_name,email,phone FROM customers WHERE user_id=? LIMIT 1`,[user.id]);const c=customers[0];if(!c)return {...base,customer:null};
   const [stays]=await queryRows<any[]>(`SELECT t.id,t.status,t.start_date,t.end_date,t.rent_amount,t.currency,DATEDIFF(t.end_date,CURRENT_DATE()) days_remaining,p.title property,a.code apartment FROM tenancies t JOIN properties p ON p.id=t.property_id JOIN apartments a ON a.id=t.apartment_id WHERE t.customer_id=? ORDER BY t.created_at DESC LIMIT 5`,[c.id]);
   const [payments]=await queryRows<any[]>(`SELECT id,amount,currency,payment_method,status,paid_at FROM payments WHERE customer_id=? ORDER BY created_at DESC LIMIT 10`,[c.id]);
   const [services]=await queryRows<any[]>(`SELECT sr.id,sr.title,sr.description,sr.priority,sr.status,sr.requested_at,sr.completed_at,sr.admin_response,u.full_name assigned_admin,(SELECT JSON_ARRAYAGG(JSON_OBJECT('description',si.description,'quantity',si.quantity,'unit_price',si.unit_price,'currency',si.currency)) FROM service_items si WHERE si.service_request_id=sr.id) service_items FROM service_requests sr LEFT JOIN users u ON u.id=sr.assigned_admin_id WHERE sr.customer_id=? ORDER BY sr.requested_at DESC LIMIT 10`,[c.id]);
   const [visits]=await queryRows<any[]>(`SELECT vr.id,vr.status,vr.requested_for,vr.completed_at,p.title property,u.full_name assigned_admin FROM visit_requests vr JOIN properties p ON p.id=vr.property_id LEFT JOIN users u ON u.id=vr.assigned_admin_id WHERE vr.customer_id=? ORDER BY vr.created_at DESC LIMIT 10`,[c.id]);
   const [extensions]=await queryRows<any[]>(`SELECT id,status,requested_end_date,reason,created_at,decided_at FROM stay_extension_requests WHERE customer_id=? ORDER BY created_at DESC LIMIT 5`,[c.id]);
   return {...base,customer:c,stays,payments,services,visits,extensions};
 }
 if(user.roles.includes("owner")){
   const [summary]=await queryRows<any[]>(`SELECT currency,COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END),0) net_balance,COALESCE(SUM(CASE WHEN entry_type='rent_income' THEN amount ELSE 0 END),0) rent_income,COALESCE(SUM(CASE WHEN entry_type='commission' THEN amount ELSE 0 END),0) commission,COALESCE(SUM(CASE WHEN entry_type='maintenance' THEN amount ELSE 0 END),0) maintenance FROM owner_ledger WHERE owner_id=? GROUP BY currency`,[user.id]);
   const [ledger]=await queryRows<any[]>(`SELECT entry_type,description,amount,currency,direction,created_at FROM owner_ledger WHERE owner_id=? ORDER BY created_at DESC LIMIT 15`,[user.id]);return {...base,summary_by_currency:summary,ledger};
 }
 if(user.roles.some(r=>["it","admin","receptionist"].includes(r))){
   const [counts]=await queryRows<any[]>(`SELECT (SELECT COUNT(*) FROM tenancies WHERE status IN('active','extension_requested')) active_stays,(SELECT COUNT(*) FROM service_requests WHERE status NOT IN('completed','cancelled')) open_services,(SELECT COUNT(*) FROM service_requests WHERE priority IN('urgent','emergency') AND status NOT IN('completed','cancelled')) urgent_services,(SELECT COUNT(*) FROM apartments WHERE status='available') available_units,(SELECT COUNT(*) FROM visit_requests WHERE status NOT IN('completed','cancelled','expired')) open_visits`);return {...base,operations:counts[0]};
 }
 if(user.roles.includes("agent")){const [p]=await queryRows<any[]>(`SELECT id,title,status FROM properties WHERE agent_id=? ORDER BY updated_at DESC LIMIT 20`,[user.id]);return {...base,assignedProperties:p};}
 return base;
}
