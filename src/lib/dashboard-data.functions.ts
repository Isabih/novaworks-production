import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { assertRoles, rows, audit } from "./db-utils.server";

export const getAdminDashboard = createServerFn({ method: "GET" }).middleware([requireMysqlAuth]).handler(async ({ context }) => {
  await assertRoles(context.userId,["it","admin"]);
  const [counts] = await rows<any>(`SELECT
    (SELECT COUNT(*) FROM users WHERE active=1) users,
    (SELECT COUNT(*) FROM properties WHERE status='active') properties,
    (SELECT COUNT(*) FROM apartments WHERE status='available') available_units,
    (SELECT COUNT(*) FROM tenancies WHERE status IN('active','extension_requested')) active_stays,
    (SELECT COUNT(*) FROM service_requests WHERE status NOT IN('completed','cancelled')) open_services,
    (SELECT COUNT(*) FROM visit_requests WHERE status NOT IN('completed','cancelled','expired')) open_visits`);
  const financials = await rows<any>(`SELECT currency,
    COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.status='confirmed' AND p.currency=x.currency AND YEAR(p.paid_at)=YEAR(UTC_TIMESTAMP()) AND MONTH(p.paid_at)=MONTH(UTC_TIMESTAMP())),0) month_revenue,
    COALESCE((SELECT SUM(l.amount) FROM owner_ledger l WHERE l.entry_type='commission' AND l.currency=x.currency AND YEAR(l.created_at)=YEAR(UTC_TIMESTAMP()) AND MONTH(l.created_at)=MONTH(UTC_TIMESTAMP())),0) month_commission
    FROM (SELECT currency FROM payments UNION SELECT currency FROM owner_ledger) x GROUP BY currency ORDER BY currency`);
  return {...counts, financials};
});

export const getCustomerDashboard = createServerFn({ method: "GET" }).middleware([requireMysqlAuth]).handler(async ({ context }) => {
  await assertRoles(context.userId,["customer"]);
  const customer=(await rows<any>(`SELECT * FROM customers WHERE user_id=? LIMIT 1`,[context.userId]))[0];
  if(!customer) return {customer:null,stay:null,saved:0,visits:0,inquiries:0,services:[]};
  const stay=(await rows<any>(`SELECT t.*,p.title property_title,p.currency property_currency,a.code apartment_code,COALESCE(a.monthly_price,p.price,0) booking_rate,DATEDIFF(t.end_date,CURRENT_DATE()) days_remaining FROM tenancies t JOIN properties p ON p.id=t.property_id JOIN apartments a ON a.id=t.apartment_id WHERE t.customer_id=? AND t.status IN('active','reserved','extension_requested') ORDER BY t.created_at DESC LIMIT 1`,[customer.id]))[0]||null;
  const [stats]=(await rows<any>(`SELECT (SELECT COUNT(*) FROM saved_properties WHERE user_id=?) saved,(SELECT COUNT(*) FROM visit_requests WHERE customer_id=? AND status NOT IN('cancelled','expired')) visits,(SELECT COUNT(*) FROM property_inquiries WHERE user_id=?) inquiries`,[context.userId,customer.id,context.userId]));
  const services=await rows<any>(`SELECT id,title,priority,status,requested_at,completed_at,admin_response,expected_at FROM service_requests WHERE customer_id=? ORDER BY requested_at DESC LIMIT 5`,[customer.id]);
  const settings=(await rows<any>(`SELECT contact_info,reply_to FROM app_settings WHERE id=1`))[0]||{};let contact:any={};try{contact=typeof settings.contact_info==="string"?JSON.parse(settings.contact_info):settings.contact_info||{}}catch{};return {customer,stay,...stats,services,contact:{email:contact.email||settings.reply_to||process.env.RESEND_REPLY_TO||"info@novaworks.rw",phone:contact.phone||process.env.PUBLIC_RECEPTION_PHONE||"+250 788 000 000"}};
});

export const getOwnerDashboard = createServerFn({ method: "GET" }).middleware([requireMysqlAuth]).handler(async ({ context }) => {
  await assertRoles(context.userId,["owner"]);
  const properties=await rows<any>(`SELECT p.id,p.title,p.currency,COUNT(a.id) units,SUM(a.status='occupied') occupied,SUM(a.status='available') available FROM properties p LEFT JOIN apartments a ON a.property_id=p.id WHERE p.owner_id=? GROUP BY p.id ORDER BY p.title`,[context.userId]);
  const ledger=await rows<any>(`SELECT * FROM owner_ledger WHERE owner_id=? ORDER BY created_at DESC LIMIT 100`,[context.userId]);
  const balance=await rows<any>(`SELECT currency,COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END),0) net_balance,COALESCE(SUM(CASE WHEN entry_type='rent_income' THEN amount ELSE 0 END),0) rent_income,COALESCE(SUM(CASE WHEN entry_type='commission' THEN amount ELSE 0 END),0) commission,COALESCE(SUM(CASE WHEN entry_type='maintenance' THEN amount ELSE 0 END),0) maintenance FROM owner_ledger WHERE owner_id=? GROUP BY currency ORDER BY currency`,[context.userId]);
  const [activity]=(await rows<any>(`SELECT (SELECT COUNT(*) FROM bookings b JOIN properties p ON p.id=b.property_id WHERE p.owner_id=? AND b.status IN('pending','confirmed')) bookings,(SELECT COUNT(*) FROM service_requests sr JOIN properties p ON p.id=sr.property_id WHERE p.owner_id=? AND sr.status NOT IN('completed','cancelled')) services`,[context.userId,context.userId]));
  return {properties,ledger,balance,activity};
});

export const getAgentDashboard = createServerFn({ method: "GET" }).middleware([requireMysqlAuth]).handler(async ({ context }) => {
  await assertRoles(context.userId,["agent"]);
  const properties=await rows<any>(`SELECT id,title,price,currency FROM properties WHERE agent_id=? AND status='active' ORDER BY updated_at DESC`,[context.userId]);
  const ids=properties.map((p:any)=>p.id);
  let leads=0,visits=0;
  if(ids.length){const marks=ids.map(()=>'?').join(','); const [s]=await rows<any>(`SELECT COUNT(*) leads,SUM(scheduled_at IS NOT NULL) visits FROM property_inquiries WHERE property_id IN (${marks})`,ids); leads=Number(s?.leads||0);visits=Number(s?.visits||0)}
  return {properties,leads,visits,portfolio:properties.reduce((a:any,p:any)=>a+Number(p.price||0),0)};
});

export const getNotifications = createServerFn({method:"GET"}).middleware([requireMysqlAuth]).handler(async({context})=>rows<any>(context.roles.includes('receptionist')?`SELECT * FROM staff_notifications WHERE user_id=? AND type IN('booking_request','booking_update','mail') ORDER BY created_at DESC LIMIT 100`:`SELECT * FROM staff_notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100`,[context.userId]));
export const markNotificationsRead = createServerFn({method:"POST"}).middleware([requireMysqlAuth]).validator((d:{ids:string[];action?:string})=>d).handler(async({data,context})=>{if(!data.ids.length)return{ok:true};const marks=data.ids.map(()=>"?").join(",");const unread=await rows<any>(`SELECT id,type,title,reference_id FROM staff_notifications WHERE user_id=? AND read_at IS NULL AND id IN (${marks})`,[context.userId,...data.ids]);await rows<any>(`UPDATE staff_notifications SET read_at=UTC_TIMESTAMP() WHERE user_id=? AND id IN (${marks})`,[context.userId,...data.ids]);for(const n of unread){
  if(n.reference_id){
    const first=(await rows<any>(`SELECT id FROM audit_logs WHERE action='NOTIFICATION_OPENED_FIRST' AND entity_type='notification_reference' AND entity_id=? LIMIT 1`,[n.reference_id]))[0];
    if(!first) await audit(context.userId,"NOTIFICATION_OPENED_FIRST","notification_reference",n.reference_id,null,{type:n.type,title:n.title,notification_id:n.id,action:data.action||"opened"});
  }
  await audit(context.userId,"NOTIFICATION_OPENED","staff_notification",n.id,null,{type:n.type,title:n.title,reference_id:n.reference_id,action:data.action||"opened"});
}return{ok:true}});
