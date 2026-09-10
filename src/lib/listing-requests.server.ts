import {createHash,randomUUID} from "node:crypto";
import {getDb,queryRows,withTransaction} from "./mysql.server";
import {rows,parseJson,audit} from "./db-utils.server";
import {optionalPrice,priceVisibility} from "./price-policy";
import {getContactContent} from "./contact-content.functions";
import {getSessionUser,bearer} from "./auth.server";
import {AwsClient} from "aws4fetch";

const emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe=/^\+?[0-9 ()-]{7,25}$/;
const types=new Set(["apartment","luxury-apartment","villa","building","office","land","studio","commercial","residential","penthouse"]);
const txt=(v:any,n=500)=>String(v??"").trim().slice(0,n);
const escapeHtml=(s:any)=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
const validUrl=(v:any)=>{if(!v)return null;const u=new URL(String(v));if(!["https:","http:"].includes(u.protocol))throw new Error("Invalid video URL");return u.href};
const validNumber=(v:any)=>v==null||v===""?null:Number(v);
export function validateListing(d:any){
 const x:any={
  full_name:txt(d.full_name,150),email:txt(d.email,255).toLowerCase(),phone:txt(d.phone,40),
  title:txt(d.title,255),property_type:txt(d.property_type,80),listing_type:txt(d.listing_type,20),
  location:txt(d.location,255),district:txt(d.district,120)||null,description:txt(d.description,10000)||null,
  currency:txt(d.currency||"USD",3),price:optionalPrice(d.price),show_price:priceVisibility(d.show_price),
  bedrooms:validNumber(d.bedrooms),bathrooms:validNumber(d.bathrooms),area_sqm:validNumber(d.area_sqm),
  year_built:validNumber(d.year_built),video_url:validUrl(d.video_url)
 };
 if(!x.full_name||!x.title||!x.location||!emailRe.test(x.email)||!phoneRe.test(x.phone))throw new Error("Enter your name, valid email, phone, property title and location");
 if(!types.has(x.property_type)||!["sale","rent"].includes(x.listing_type))throw new Error("Invalid property or listing type");
 if(!["USD","RWF","EUR"].includes(x.currency))throw new Error("Invalid currency");
 if(x.show_price&&(!x.price||x.price<=0))throw new Error("Enter a positive price to display it publicly");
 for(const k of ["bedrooms","bathrooms","area_sqm"])if(x[k]!=null&&(!Number.isFinite(x[k])||x[k]<0))throw new Error("Invalid "+k);
 if(x.year_built!=null&&(!Number.isInteger(x.year_built)||x.year_built<1800||x.year_built>new Date().getUTCFullYear()+2))throw new Error("Invalid year built");
 return x;
}
async function contact(){
 try{const c=await getContactContent();return{email:c.info.email,phone:c.info.phone}}
 catch{return{email:process.env.NOVAWORKS_CONTACT_EMAIL||"info@novaworks.rw",phone:process.env.NOVAWORKS_PHONE||""}}
}
function mailBody(title:string,body:string,c:{email:string;phone:string}){
 const phone=c.phone?`<p>Phone: ${escapeHtml(c.phone)}</p>`:"";
 return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#202020"><h1 style="font-family:Georgia,serif">${escapeHtml(title)}</h1>${body}<hr/><p>NOVAWORKS · Digital Real Estate Platform</p><p>Email: ${escapeHtml(c.email)}</p>${phone}<p>https://novaworks.rw</p></div>`;
}
async function enqueue(c:any,listingId:string,to:string,kind:string,subject:string,html:string){
 await c.execute(`INSERT INTO listing_email_outbox(id,listing_id,recipient,kind,subject,body_html) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id`,[randomUUID(),listingId,to.toLowerCase(),kind,subject,html]);
}
async function recipients(){
 return rows<any>(`SELECT DISTINCT u.id,u.full_name,COALESCE(NULLIF(u.business_email,''),u.email) email
 FROM users u JOIN user_roles r ON r.user_id=u.id
 WHERE u.active=1 AND r.role IN('it','admin') AND COALESCE(NULLIF(u.business_email,''),u.email) IS NOT NULL`);
}
async function rateLimit(request:Request,email:string){
 const ip=(request.headers.get("cf-connecting-ip")||"").trim();
 // Do not trust arbitrary X-Forwarded-For headers. Use the server's trusted proxy
 // header when configured, and always apply the email-based limit as well.
 const salt=process.env.LISTING_RATE_LIMIT_SECRET||process.env.SESSION_SECRET;
 if(!salt)throw new Error("Listing rate-limit secret is not configured");
 const keys=[`email:${email}`,`ip:${ip||"unknown"}`];
 await withTransaction(async c=>{
  for(const key of keys){
   const hash=createHash("sha256").update(salt+":"+key).digest("hex");
   const window=new Date();window.setUTCMinutes(0,0,0);
   const date=window.toISOString().slice(0,19).replace("T"," ");
   await c.execute(`INSERT INTO listing_submission_limits(identity_hash,window_start,attempts) VALUES(?,?,1) ON DUPLICATE KEY UPDATE attempts=attempts+1`,[hash,date]);
   const [r]=await c.execute(`SELECT attempts FROM listing_submission_limits WHERE identity_hash=? AND window_start=?`,[hash,date]) as any;
   if(Number(r[0].attempts)>3)throw new Error("Too many submissions. Please try again later.");
  }
 });
}
function detectImage(bytes:Buffer):string|null{
 if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return"image/jpeg";
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return"image/png";
 if(bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP")return"image/webp";
 return null;
}
async function uploadImages(files:File[],id:string){
 if(files.length>8)throw new Error("Maximum 8 images per submission");
 if(!files.length)return[];
 const account=process.env.R2_ACCOUNT_ID,accessKeyId=process.env.R2_ACCESS_KEY_ID,secretAccessKey=process.env.R2_SECRET_ACCESS_KEY;
 const bucket=process.env.R2_BUCKET||"uploads",base=process.env.R2_PUBLIC_BASE_URL||process.env.R2_PUBLIC_URL;
 if(!account||!accessKeyId||!secretAccessKey||!base)throw new Error("Property media storage is not configured");
 const client=new AwsClient({accessKeyId,secretAccessKey,service:"s3",region:"auto"});
 const endpoint=(process.env.R2_ENDPOINT||`https://${account}.r2.cloudflarestorage.com`).replace(/\/+$/,"");
 const result:any[]=[];
 for(const file of files){
  if(file.size<100||file.size>8*1024*1024)throw new Error("Each image must be under 8 MB");
  const bytes=Buffer.from(await file.arrayBuffer());const mime=detectImage(bytes);
  if(!mime)throw new Error("Only valid JPEG, PNG and WebP images are supported");
  const ext=mime==="image/jpeg"?"jpg":mime==="image/png"?"png":"webp";
  const key=`listing-requests/${id}/${randomUUID()}.${ext}`;
  const response=await client.fetch(`${endpoint}/${bucket}/${key}`,{method:"PUT",headers:{"Content-Type":mime,"Cache-Control":"public,max-age=31536000,immutable"},body:bytes});
  if(!response.ok)throw new Error(`Media upload failed (${response.status})`);
  result.push({url:`${base.replace(/\/+$/,"")}/${key}`,path:key,section:"main"});
 }
 return result;
}
export async function submitListing(request:Request,form:FormData){
 const raw=form.get("details");if(typeof raw!=="string")throw new Error("Listing details required");
 const d=validateListing(JSON.parse(raw));
 const files=form.getAll("images").filter((x):x is File=>typeof x!=="string");
 if(files.length>8||files.reduce((n,f)=>n+f.size,0)>32*1024*1024)throw new Error("Maximum 8 images and 32 MB total");
 await rateLimit(request,d.email);
 const id=randomUUID(),reference="NW-"+new Date().toISOString().slice(0,10).replace(/-/g,"")+"-"+id.slice(0,6).toUpperCase();
 const images=await uploadImages(files,id);
 const c=await contact();
 const managers=await recipients();
 const user=await getSessionUser(bearer(request));
 const applicant=user?.email?.toLowerCase()===d.email?user.id:null;
 const title="Property listing received";
 const acknowledge=mailBody(title,`<p>Dear ${escapeHtml(d.full_name)},</p><p>Thank you for submitting <strong>${escapeHtml(d.title)}</strong>.</p><p>Your reference is <strong>${reference}</strong>. Our team aims to review your request and contact you within 24 hours. We will reach you using the contact details you provided. Submission does not mean the property has been published.</p><p>If you need assistance, contact us using the details below.</p>`,c);
 await withTransaction(async conn=>{
  const v={...d,id,reference,applicant_user_id:applicant,images_json:JSON.stringify(images)};
  const keys=Object.keys(v);
  await conn.execute(`INSERT INTO property_listing_requests(${keys.join(",")},response_due_at) VALUES(${keys.map(()=>"?").join(",")},DATE_ADD(UTC_TIMESTAMP(),INTERVAL 24 HOUR))`,keys.map(k=>v[k]));
  await enqueue(conn,id,d.email,"acknowledgement",title,acknowledge);
  for(const m of managers){
   const body=mailBody("New property listing",`<p>A new listing requires review.</p><p><strong>${escapeHtml(d.title)}</strong><br/>${escapeHtml(d.location)} · ${escapeHtml(d.listing_type)}</p><p>Applicant: ${escapeHtml(d.full_name)}<br/>Email: ${escapeHtml(d.email)}<br/>Phone: ${escapeHtml(d.phone)}</p><p>Reference: ${reference}</p><p><a href="https://novaworks.rw/dashboard/admin/listing-requests">Open the review queue</a></p>`,c);
   await enqueue(conn,id,m.email,"staff_new","New property listing — "+reference,body);
   await conn.execute(`INSERT INTO notifications(id,recipient_id,type,title,body,entity_type,entity_id,priority) VALUES(?,?,'property_listing','New property listing',?,'property_listing_request',?,'normal')`,[randomUUID(),m.id,`${d.title} · ${reference}`,id]);
  }
 });
 await audit(applicant,"LISTING_SUBMITTED","property_listing_request",id,null,{reference});
 return{reference,message:"Your listing has been received. Our team aims to contact you within 24 hours.",emailQueued:true};
}
export async function listRequests(){
 const r=await rows<any>(`SELECT r.*,u.full_name assigned_admin_name,
 (SELECT COUNT(*) FROM listing_email_outbox e WHERE e.listing_id=r.id AND e.status='failed') failed_emails
 FROM property_listing_requests r LEFT JOIN users u ON u.id=r.assigned_admin_id ORDER BY r.created_at DESC LIMIT 500`);
 return r.map(x=>({...x,images:parseJson(x.images_json,[])}));
}
export async function reviewListing(id:string,actor:string,action:string,note:string,assignee?:string|null){
 if(!["in_review","approved","rejected","contacted"].includes(action))throw new Error("Invalid review action");
 const old=(await rows<any>(`SELECT * FROM property_listing_requests WHERE id=?`,[id]))[0];
 if(!old)throw new Error("Listing request not found");
 if(["approved","rejected"].includes(old.status))throw new Error("This request is already closed");
 const c=await contact();
 let linked:string|null=old.linked_property_id;
 await withTransaction(async conn=>{
  if(action==="approved"&&!linked){
   linked=randomUUID();
   const slug=txt(old.title,80).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+linked.slice(0,8);
   await conn.execute(`INSERT INTO properties(id,slug,title,description,property_type,structure_mode,listing_type,status,price,currency,show_price,bedrooms,bathrooms,area_sqm,city,district,video_url,unit_count) VALUES(?,?,?,? ,?,'standalone',?,'draft',?,?,?,?,?,?,?,?,?,0)`,[linked,slug,old.title,old.description,old.property_type,old.listing_type,old.price,old.currency,old.show_price,old.bedrooms??0,old.bathrooms??0,old.area_sqm,old.location,old.district,old.video_url]);
   const imgs=parseJson<any[]>(old.images_json,[]);
   for(let i=0;i<imgs.length;i++)await conn.execute(`INSERT INTO property_images(id,property_id,url,storage_path,position,is_cover,section,provider) VALUES(?,?,?,?,?,?,?,'r2')`,[randomUUID(),linked,imgs[i].url,imgs[i].path||null,i,i===0?1:0,imgs[i].section||"main"]);
  }
  const status=action==="contacted"?"in_review":action;
  await conn.execute(`UPDATE property_listing_requests SET status=?,assigned_admin_id=COALESCE(?,assigned_admin_id),reviewed_by=?,review_note=?,linked_property_id=COALESCE(?,linked_property_id),applicant_contacted_at=CASE WHEN ?='contacted' THEN UTC_TIMESTAMP() ELSE applicant_contacted_at END WHERE id=?`,[status,assignee||null,actor,note||null,linked,action,id]);
  if(action==="approved"||action==="rejected"){
   const approved=action==="approved";
   const html=mailBody(approved?"Your property listing has been reviewed":"Update on your property listing",`<p>Dear ${escapeHtml(old.full_name)},</p><p>Your listing <strong>${escapeHtml(old.title)}</strong> (${old.reference}) has been reviewed.</p><p>${approved?"Our team has approved your submission for the next preparation stage. It will be published only after final verification and approval.":"Our team cannot proceed with this listing at this time."}</p>${note?`<p>Message from our team: ${escapeHtml(note)}</p>`:""}`,c);
   await enqueue(conn,id,old.email,"decision",approved?"NOVAWORKS listing review — "+old.reference:"NOVAWORKS listing update — "+old.reference,html);
  }
 });
 await audit(actor,"LISTING_"+action.toUpperCase(),"property_listing_request",id,null,{note,linked_property_id:linked});
 return{ok:true,linked_property_id:linked};
}
