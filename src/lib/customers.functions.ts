import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { rows,uuid,assertRoles,parseJson,audit,sqlDate,requireFeature } from "./db-utils.server";
import { queryRows,withTransaction } from "./mysql.server";
import { makeOtp,makeTemporaryPassword,hashPassword } from "./security.server";
import { sendMail } from "./mailer.server";

export const listCustomers=createServerFn({method:"GET"}).middleware([requireMysqlAuth]).handler(async({context})=>{await assertRoles(context.userId,["it","admin","receptionist"]);return rows<any>(`SELECT c.*,p.title property_title,a.code apartment_code,t.id tenancy_id,t.status tenancy_status,t.start_date,t.end_date,t.rent_amount,t.currency FROM customers c LEFT JOIN tenancies t ON t.customer_id=c.id AND t.status IN('reserved','active','extension_requested') LEFT JOIN properties p ON p.id=t.property_id LEFT JOIN apartments a ON a.id=t.apartment_id ORDER BY c.updated_at DESC LIMIT 200`)});

// Kept for compatibility; new reception UI uses startReceptionRegistration/completeReceptionRegistration.
export const createCustomer=createServerFn({method:"POST"}).middleware([requireMysqlAuth]).validator((d:any)=>d).handler(async({data,context})=>{await assertRoles(context.userId,["it","admin","receptionist"]);const id=uuid();await queryRows<any>(`INSERT INTO customers(id,full_name,email,phone,created_by,qr_token) VALUES(?,?,?,?,?,?)`,[id,data.full_name.trim(),data.email.trim().toLowerCase(),data.phone.trim(),context.userId,uuid()]);return{id}});

export const searchCustomers=createServerFn({method:"GET"}).middleware([requireMysqlAuth]).validator((d:{q:string})=>d).handler(async({data,context})=>{await assertRoles(context.userId,["it","admin","receptionist"]);const q=`%${data.q.trim()}%`;if(data.q.trim().length<2)return[];return rows<any>(`SELECT c.*,t.id tenancy_id,t.status tenancy_status,t.start_date,t.end_date,p.title property_title,a.code apartment_code,(SELECT COUNT(*) FROM tenancies th WHERE th.customer_id=c.id) stay_count,(SELECT COALESCE(SUM(amount),0) FROM payments py WHERE py.customer_id=c.id AND py.status='confirmed') total_paid FROM customers c LEFT JOIN tenancies t ON t.customer_id=c.id AND t.status IN('active','reserved','extension_requested') LEFT JOIN properties p ON p.id=t.property_id LEFT JOIN apartments a ON a.id=t.apartment_id WHERE c.full_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.national_id LIKE ? ORDER BY c.updated_at DESC LIMIT 20`,[q,q,q,q])});

export const getCustomerHistory=createServerFn({method:"GET"}).middleware([requireMysqlAuth]).validator((d:{customer_id:string})=>d).handler(async({data,context})=>{await assertRoles(context.userId,["it","admin","receptionist"]);const customer=(await rows<any>(`SELECT * FROM customers WHERE id=?`,[data.customer_id]))[0];if(!customer)throw new Error("Customer not found");const stays=await rows<any>(`SELECT t.*,p.title property_title,a.code apartment_code FROM tenancies t JOIN properties p ON p.id=t.property_id JOIN apartments a ON a.id=t.apartment_id WHERE t.customer_id=? ORDER BY t.created_at DESC`,[data.customer_id]);const payments=await rows<any>(`SELECT * FROM payments WHERE customer_id=? ORDER BY created_at DESC`,[data.customer_id]);const services=await rows<any>(`SELECT id,title,priority,status,requested_at,completed_at FROM service_requests WHERE customer_id=? ORDER BY requested_at DESC LIMIT 50`,[data.customer_id]);return{customer,stays,payments,services}});

export const listStaffForAssignment=createServerFn({method:"GET"}).middleware([requireMysqlAuth]).handler(async({context})=>{await assertRoles(context.userId,["it","admin","receptionist"]);return rows<any>(`SELECT u.id,u.full_name name,u.email,ur.role FROM user_roles ur JOIN users u ON u.id=ur.user_id WHERE ur.role IN('agent','owner') AND u.active=1 ORDER BY u.full_name`)});
export const listPropertiesForBooking=createServerFn({method:"GET"}).middleware([requireMysqlAuth]).handler(async({context})=>{await assertRoles(context.userId,["it","admin","receptionist","customer"]);return rows<any>(`SELECT p.id,p.title,p.property_type,p.city,p.status,p.unit_count,p.currency,p.price,(SELECT COUNT(*) FROM available_apartments a WHERE a.property_id=p.id) available_units FROM properties p WHERE p.status IN('active','maintenance') ORDER BY p.created_at DESC LIMIT 300`)});
export const listAvailableApartments=createServerFn({method:"GET"}).middleware([requireMysqlAuth]).validator((d:{property_id:string})=>d).handler(async({data,context})=>{await assertRoles(context.userId,["it","admin","receptionist","customer"]);return rows<any>(`SELECT a.* FROM apartments a WHERE a.property_id=? AND a.status='available' AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.apartment_id=a.id AND b.status IN('pending','confirmed')) ORDER BY a.code`,[data.property_id])});

export const startReceptionRegistration=createServerFn({method:"POST"}).middleware([requireMysqlAuth]).validator((d:{
 existing_customer_id?:string|null;full_name:string;email:string;phone:string;national_id?:string|null;nida_snapshot?:any;
 country?:string;province?:string;district?:string;sector?:string;cell?:string;village?:string;
 property_id:string;apartment_id:string;stay_start:string;stay_end:string;rent_amount:number;currency?:string;amount_paid?:number;payment_method?:string
})=>d).handler(async({data,context})=>{
 await assertRoles(context.userId,["it","admin","receptionist"]);await requireFeature("customer_registration");
 if(new Date(data.stay_end)<=new Date(data.stay_start))throw new Error("Stay end must be after stay start");
 const apt=(await rows<any>(`SELECT a.*,p.title,p.commission_percent,p.currency FROM available_apartments a JOIN properties p ON p.id=a.property_id WHERE a.id=? AND a.property_id=?`,[data.apartment_id,data.property_id]))[0];
 if(!apt)throw new Error("That apartment is no longer available. Refresh and choose another unit.");
 let existing:any=null;if(data.existing_customer_id)existing=(await rows<any>(`SELECT * FROM customers WHERE id=?`,[data.existing_customer_id]))[0];
 const trusted=!!(existing?.email_verified_at&&existing?.nida_verified_at);const code=makeOtp();const id=uuid();
 const full=existing?.full_name||data.full_name.trim();const email=(existing?.email||data.email).trim().toLowerCase();const phone=existing?.phone||data.phone.trim();
 const nida:any=existing?parseJson(existing.nida_snapshot_json,{}):(data.nida_snapshot||{});
 const hasNida=Object.keys(nida||{}).length>0;
 const country=existing?.country||nida.domicileCountry||data.country||"Rwanda";
 const province=existing?.province||nida.domicileProvince||data.province||null;
 const district=existing?.domicile_district||nida.domicileDistrict||data.district||null;
 const sector=existing?.domicile_sector||nida.domicileSector||data.sector||null;
 const cell=existing?.domicile_cell||nida.domicileCell||data.cell||null;
 const village=existing?.domicile_village||nida.domicileVillage||data.village||null;
 await queryRows<any>(`INSERT INTO pending_customer_registrations(
   id,created_by,existing_customer_id,full_name,email,phone,national_id,
   gender,date_of_birth,place_of_birth,nationality,civil_status,father_name,mother_name,surname,post_names,
   nida_upi,nida_fosaid,nida_service_available,nida_photo,nida_verified_at,country,province,district,sector,cell,village,nida_snapshot_json,
   property_id,apartment_id,stay_start,stay_end,rent_amount,currency,amount_paid,payment_method,verification_code,verification_expires_at,email_verified_at
 ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 5 MINUTE),?)`,[
   id,context.userId,existing?.id||null,full,email,phone,existing?.national_id||data.national_id||null,
   existing?.gender||nida.sex||null,existing?.date_of_birth||nida.dateOfBirth||null,existing?.place_of_birth||nida.placeOfBirth||null,existing?.nationality||nida.nationality||null,existing?.civil_status||nida.civilStatus||nida.maritalStatus||null,
   existing?.father_name||nida.fatherName||null,existing?.mother_name||nida.motherName||null,existing?.surname||nida.surName||null,existing?.post_names||nida.postNames||null,
   existing?.nida_upi||nida.upi||null,existing?.nida_fosaid||nida.fosaid||process.env.NIDA_FOSAID||"0023",hasNida?(nida.nidaServiceAvailable===true?1:0):null,existing?.nida_photo||nida.photo||null,hasNida?(existing?.nida_verified_at||new Date()):null,
   country,province,district,sector,cell,village,JSON.stringify(nida),
   data.property_id,data.apartment_id,data.stay_start,data.stay_end,Number(data.rent_amount||0),data.currency||apt.currency||"USD",Number(data.amount_paid||0),data.payment_method||null,code,trusted?new Date():null
 ]);
 if(!trusted)await sendMail(email,"Verify your NOVAWORKS stay",`<h2>Confirm your stay registration</h2><p>Hello ${full},</p><p>Your six-digit verification code is <b style="font-size:28px;letter-spacing:6px">${code}</b>.</p><p>It expires in 5 minutes. Reception will only save your stay after this verification.</p>`);
 return{id,requiresVerification:!trusted,email,customerName:full};
});

export const completeReceptionRegistration=createServerFn({method:"POST"}).middleware([requireMysqlAuth]).validator((d:{registration_id:string;code?:string})=>d).handler(async({data,context})=>{
 await assertRoles(context.userId,["it","admin","receptionist"]);const reg=(await rows<any>(`SELECT * FROM pending_customer_registrations WHERE id=?`,[data.registration_id]))[0];
 if(!reg)throw new Error("Registration session not found or already completed");
 if(!reg.email_verified_at&&(reg.verification_code!==data.code||new Date(reg.verification_expires_at)<new Date()))throw new Error("Invalid or expired verification code");
 const result=await withTransaction(async conn=>{
   const [locked]:any=await conn.execute(`SELECT a.*,p.owner_id,p.commission_percent,p.title property_title FROM apartments a JOIN properties p ON p.id=a.property_id WHERE a.id=? FOR UPDATE`,[reg.apartment_id]);const apt=locked[0];
   if(!apt||apt.status==="maintenance")throw new Error("Apartment is not available. Please select another unit.");
   const [overlap]:any=await conn.execute(`SELECT id FROM tenancies WHERE apartment_id=? AND status IN('reserved','active','extension_requested') AND end_date>=CURRENT_DATE() LIMIT 1`,[reg.apartment_id]);if(overlap[0])throw new Error("Apartment is already occupied or reserved.");
   let customerId=reg.existing_customer_id;let tempPassword:string|null=null;let userId:string|null=null;
   if(!customerId){
     customerId=uuid();const qr=uuid();
     await conn.execute(`INSERT INTO customers(
       id,full_name,email,phone,national_id,gender,date_of_birth,place_of_birth,nationality,civil_status,father_name,mother_name,surname,post_names,
       country,province,domicile_country,domicile_district,domicile_sector,domicile_cell,domicile_village,nida_upi,nida_fosaid,nida_service_available,nida_photo,
       nida_verified_at,nida_snapshot_json,email_verified_at,qr_token,created_by
     ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[
       customerId,reg.full_name,reg.email,reg.phone,reg.national_id,reg.gender,reg.date_of_birth,reg.place_of_birth,reg.nationality,reg.civil_status,reg.father_name,reg.mother_name,reg.surname,reg.post_names,
       reg.country||"Rwanda",reg.province,reg.country||"Rwanda",reg.district,reg.sector,reg.cell,reg.village,reg.nida_upi,reg.nida_fosaid,reg.nida_service_available,reg.nida_photo,
       reg.nida_verified_at,reg.nida_snapshot_json,new Date(),qr,context.userId
     ]);
     const [users]:any=await conn.execute(`SELECT id FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1`,[reg.email]);
     if(users[0])userId=users[0].id;else{userId=uuid();tempPassword=makeTemporaryPassword();await conn.execute(`INSERT INTO users(id,email,password_hash,full_name,phone,email_verified_at,must_change_password) VALUES(?,?,?,?,?,UTC_TIMESTAMP(),1)`,[userId,reg.email,hashPassword(tempPassword),reg.full_name,reg.phone]);await conn.execute(`INSERT INTO user_roles(user_id,role) VALUES(?, 'customer')`,[userId]);}
     await conn.execute(`UPDATE customers SET user_id=? WHERE id=?`,[userId,customerId]);
   } else {await conn.execute(`UPDATE customers SET email_verified_at=COALESCE(email_verified_at,UTC_TIMESTAMP()) WHERE id=?`,[customerId])}
   const tenancyId=uuid();const today=new Date().toISOString().slice(0,10);const status=reg.stay_start<=today?"active":"reserved";
   await conn.execute(`INSERT INTO tenancies(id,customer_id,property_id,apartment_id,start_date,end_date,status,rent_amount,currency,commission_percent,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,[tenancyId,customerId,reg.property_id,reg.apartment_id,sqlDate(reg.stay_start),sqlDate(reg.stay_end),status,reg.rent_amount,reg.currency,apt.commission_percent,context.userId]);
   await conn.execute(`UPDATE apartments SET status=? WHERE id=?`,[status==="active"?"occupied":"reserved",reg.apartment_id]);
   if(Number(reg.amount_paid)>0){
     const paymentId=uuid();await conn.execute(`INSERT INTO payments(id,tenancy_id,customer_id,amount,currency,payment_method,status,paid_at,confirmed_by) VALUES(?,?,?,?,?,?, 'confirmed',UTC_TIMESTAMP(),?)`,[paymentId,tenancyId,customerId,reg.amount_paid,reg.currency,reg.payment_method,context.userId]);
     if(apt.owner_id){await conn.execute(`INSERT INTO owner_ledger(id,owner_id,property_id,tenancy_id,entry_type,description,amount,currency,direction,created_by) VALUES(?,?,?,?, 'rent_income',?,?,?,?,?)`,[uuid(),apt.owner_id,reg.property_id,tenancyId,`Rent received — ${reg.full_name}`,reg.amount_paid,reg.currency,"credit",context.userId]);const commission=Number(reg.amount_paid)*Number(apt.commission_percent)/100;await conn.execute(`INSERT INTO owner_ledger(id,owner_id,property_id,tenancy_id,entry_type,description,amount,currency,direction,created_by) VALUES(?,?,?,?, 'commission',?,?,?,?,?)`,[uuid(),apt.owner_id,reg.property_id,tenancyId,`NOVAWORKS commission (${apt.commission_percent}%)`,commission,reg.currency,"debit",context.userId]);}
   }
   await conn.execute(`DELETE FROM pending_customer_registrations WHERE id=?`,[reg.id]);return{customerId,tenancyId,tempPassword,userId,propertyTitle:apt.property_title,apartmentCode:apt.code};
 });
 const days=Math.max(0,Math.ceil((new Date(reg.stay_end).getTime()-new Date(reg.stay_start).getTime())/86400000));
 let html=`<h2>Welcome to NOVAWORKS</h2><p>Hello ${reg.full_name}, your stay has been registered.</p><p><b>Property:</b> ${result.propertyTitle}<br/><b>Apartment:</b> ${result.apartmentCode}<br/><b>Stay:</b> ${sqlDate(reg.stay_start)} to ${sqlDate(reg.stay_end)} (${days} days)<br/><b>Payment recorded:</b> ${reg.currency} ${Number(reg.amount_paid).toLocaleString()}</p>`;
 if(result.tempPassword)html+=`<p>Your portal login is <b>${reg.email}</b> and temporary password <b>${result.tempPassword}</b>. You will be required to change it.</p>`;html+=`<p>Enjoy your stay with NOVAWORKS.</p>`;
 try{await sendMail(reg.email,"Your NOVAWORKS stay details",html)}catch{}
 await audit(context.userId,"CUSTOMER_STAY_REGISTERED","tenancy",result.tenancyId,null,{customer_id:result.customerId,property_id:reg.property_id,apartment_id:reg.apartment_id});
 return{...result,fullName:reg.full_name,email:reg.email,startDate:sqlDate(reg.stay_start),endDate:sqlDate(reg.stay_end)};
});

export const getCustomerPass=createServerFn({method:"GET"}).middleware([requireMysqlAuth]).validator((d:{customer_id:string})=>d).handler(async({data,context})=>{await assertRoles(context.userId,["it","admin","receptionist"]);const c=(await rows<any>(`SELECT c.id,c.full_name,c.email,c.phone,c.national_id,c.qr_token,c.nida_verified_at,t.id tenancy_id,t.status,t.start_date,t.end_date,p.title property_title,a.code apartment_code FROM customers c LEFT JOIN tenancies t ON t.customer_id=c.id AND t.status IN('active','reserved','extension_requested') LEFT JOIN properties p ON p.id=t.property_id LEFT JOIN apartments a ON a.id=t.apartment_id WHERE c.id=? ORDER BY t.created_at DESC LIMIT 1`,[data.customer_id]))[0];if(!c)throw new Error("Customer not found");return c});
