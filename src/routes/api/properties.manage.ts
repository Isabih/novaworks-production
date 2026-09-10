import { createFileRoute } from "@tanstack/react-router";
import { bearer,getSessionUser } from "@/lib/auth.server";
import { rows,uuid,audit,parseJson } from "@/lib/db-utils.server";
import { queryRows,withTransaction } from "@/lib/mysql.server";
import { optionalPrice,priceVisibility } from "@/lib/price-policy";

const manager=(u:any)=>!!u?.roles?.some((r:string)=>["it","admin"].includes(r));
const staff=(u:any)=>!!u?.roles?.some((r:string)=>["it","admin","agent","owner"].includes(r));
const bad=(error:string,status=400)=>Response.json({error},{status});
const text=(v:any,max=500)=>String(v??"").trim().slice(0,max);
const nullable=(v:any)=>v==null||v===""?null:v;
const number=(v:any,def=0)=>v==null||v===""?def:Number(v);
const validUrl=(v:any)=>{if(!v)return null;const u=new URL(String(v));if(!["https:","http:"].includes(u.protocol))throw new Error("Only HTTP(S) media URLs are supported");return u.href};
const fields=["title","description","property_type","structure_mode","listing_type","status","price","currency","show_price","bedrooms","bathrooms","area_sqm","address","city","district","lat","lng","amenities_json","owner_id","agent_id","video_url","tour_3d_url","blueprint_url","is_luxury","featured","commission_percent","available_from","notify_subscribers"] as const;
function normalize(d:any){
 const n:any={};
 for(const k of fields)if(Object.prototype.hasOwnProperty.call(d,k)){
  let v=d[k];
  if(k==="amenities_json")v=JSON.stringify(Array.isArray(v)?v:parseJson(v,[]));
  else if(k==="price")v=optionalPrice(v);
  else if(k==="show_price")v=priceVisibility(v);
  else if(["owner_id","agent_id","area_sqm","lat","lng","available_from"].includes(k))v=nullable(v);
  else if(["video_url","tour_3d_url","blueprint_url"].includes(k))v=validUrl(v);
  else if(["bedrooms","bathrooms","commission_percent"].includes(k))v=number(v);
  else if(["is_luxury","featured","notify_subscribers"].includes(k))v=v?1:0;
  else v=text(v,k==="description"?30000:500);
  n[k]=v;
 }
 if(d.amenities!==undefined)n.amenities_json=JSON.stringify(Array.isArray(d.amenities)?d.amenities:[]);
 if(d.ownerId!==undefined)n.owner_id=nullable(d.ownerId);
 if(d.agentId!==undefined)n.agent_id=nullable(d.agentId);
 if(n.title!==undefined&&!n.title)throw new Error("Property title is required");
 if(n.listing_type!==undefined&&!["sale","rent"].includes(n.listing_type))throw new Error("Invalid listing type");
 if(n.status!==undefined&&!["draft","active","sold","rented","maintenance","archived"].includes(n.status))throw new Error("Invalid status");
 if(n.currency!==undefined&&!["USD","RWF","EUR"].includes(n.currency))throw new Error("Invalid currency");
 for(const k of ["bedrooms","bathrooms","area_sqm"])if(n[k]!=null&&(!Number.isFinite(Number(n[k]))||Number(n[k])<0))throw new Error("Invalid "+k);
 if(n.show_price&&(!Number.isFinite(Number(n.price))||Number(n.price)<=0))throw new Error("A positive price is required before it can be displayed publicly");
 return n;
}
async function validateAssignment(c:any,n:any){
 for(const k of ["owner_id","agent_id"])if(n[k]){
  const [u]=await c.execute(`SELECT id FROM users WHERE id=? AND active=1`,[n[k]]) as any;
  if(!u.length)throw new Error("Assigned user was not found");
 }
}
async function replaceImages(c:any,id:string,images:any[]){
 if(!Array.isArray(images)||images.length>200)throw new Error("Invalid image list");
 const existing=await c.execute(`SELECT * FROM property_images WHERE property_id=? FOR UPDATE`,[id]) as any;
 const byId=new Map(existing[0].map((x:any)=>[x.id,x]));
 const keep:string[]=[];
 const normalized:any[]=[];
 for(const image of images){
  if(image.id){
   const old:any=byId.get(image.id);
   if(!old)throw new Error("Image does not belong to this property");
   if(keep.includes(image.id))throw new Error("Duplicate image");
   keep.push(image.id);
   normalized.push({id:old.id,url:old.url,path:old.storage_path,provider:old.provider,section:text(image.section||old.section,80),alt:text(image.alt_text??old.alt_text,255)});
  }else{
   const url=validUrl(image.url);
   if(!url)throw new Error("Image URL required");
   normalized.push({id:uuid(),url,path:nullable(image.path),provider:"r2",section:text(image.section||"other",80),alt:text(image.alt_text,255)});
  }
 }
 for(const old of existing[0])if(!keep.includes(old.id))await c.execute(`DELETE FROM property_images WHERE id=?`,[old.id]);
 // Position and cover are updated as one transaction. Removed R2 objects are retained
 // to avoid destroying media that may still be referenced elsewhere.
 for(let i=0;i<normalized.length;i++){
  const x=normalized[i];
  if(keep.includes(x.id))await c.execute(`UPDATE property_images SET position=?,is_cover=?,section=?,alt_text=? WHERE id=?`,[i,i===0?1:0,x.section,x.alt,x.id]);
  else await c.execute(`INSERT INTO property_images(id,property_id,url,storage_path,position,is_cover,section,provider,alt_text) VALUES(?,?,?,?,?,?,?,?,?)`,[x.id,id,x.url,x.path,i,i===0?1:0,x.section,x.provider,x.alt]);
 }
}
async function getOne(id:string){
 const p=(await rows<any>(`SELECT * FROM properties WHERE id=?`,[id]))[0];
 if(!p)return null;
 p.amenities=parseJson(p.amenities_json,[]);
 p.property_images=await rows<any>(`SELECT * FROM property_images WHERE property_id=? ORDER BY is_cover DESC,position`,[id]);
 return p;
}
export const Route=createFileRoute("/api/properties/manage")({server:{handlers:{
 GET:async({request})=>{
  const u=await getSessionUser(bearer(request));if(!staff(u))return bad("Unauthorized",401);
  const id=new URL(request.url).searchParams.get("id");
  if(id){
   const p=await getOne(id);if(!p)return bad("Property not found",404);
   if(!manager(u)&&p.owner_id!==u!.id&&p.agent_id!==u!.id)return bad("Forbidden",403);
   return Response.json(p);
  }
  const where=manager(u)?"":"WHERE p.owner_id=? OR p.agent_id=?";
  const ps=await rows<any>(`SELECT p.* FROM properties p ${where} ORDER BY p.created_at DESC`,manager(u)?[]:[u!.id,u!.id]);
  for(const p of ps){p.amenities=parseJson(p.amenities_json,[]);p.property_images=await rows<any>(`SELECT * FROM property_images WHERE property_id=? ORDER BY is_cover DESC,position`,[p.id])}
  return Response.json(ps);
 },
 POST:async({request})=>{
  const u=await getSessionUser(bearer(request));if(!manager(u))return bad("Forbidden",403);
  try{
   const d=await request.json();const n=normalize(d);if(!n.title)throw new Error("Title is required");
   const id=uuid(),slug=text(d.slug||d.title,80).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+uuid().slice(0,8);
   const count=Number(d.unit_count??1);if(!Number.isInteger(count)||count<0||count>1000)throw new Error("Invalid unit count");
   const prefix=text(d.unit_code_prefix||"UNIT",20).toUpperCase().replace(/[^A-Z0-9]/g,"")||"UNIT";
   await withTransaction(async c=>{
    await validateAssignment(c,n);
    const v={...n,id,slug,property_type:n.property_type||"residential",structure_mode:n.structure_mode||"standalone",listing_type:n.listing_type||"sale",status:n.status||"draft",price:n.price??null,currency:n.currency||"USD",show_price:n.show_price??0,bedrooms:n.bedrooms??0,bathrooms:n.bathrooms??0,unit_count:count,unit_code_prefix:prefix};
    const keys=Object.keys(v);
    await c.execute(`INSERT INTO properties(${keys.join(",")}) VALUES(${keys.map(()=>"?").join(",")})`,keys.map(k=>(v as any)[k]));
    for(let i=1;i<=count;i++)await c.execute(`INSERT INTO apartments(id,property_id,code,unit_type,status,bedrooms,bathrooms,monthly_price) VALUES(?,?,?,?,'available',?,?,?)`,[uuid(),id,`${prefix}-${String(i).padStart(3,"0")}`,d.unit_type||n.property_type||"apartment",n.bedrooms??0,n.bathrooms??0,n.price??0]);
    await replaceImages(c,id,d.images||[]);
   });
   await audit(u!.id,"PROPERTY_CREATED","property",id,null,{title:n.title,unit_count:count});
   return Response.json({id,slug});
  }catch(e:any){return bad(e.message||"Unable to create property")}
 },
 PUT:async({request})=>{
  const u=await getSessionUser(bearer(request));if(!manager(u))return bad("Forbidden",403);
  try{
   const d=await request.json();if(!d.id)return bad("Property ID required");
   const old=await getOne(d.id);if(!old)return bad("Property not found",404);
   const n=normalize(d);
   const next={...old,...n};
   if(next.show_price&&(!next.price||Number(next.price)<=0))throw new Error("A positive price is required for public display");
   await withTransaction(async c=>{
    await validateAssignment(c,n);
    const keys=Object.keys(n);
    if(keys.length)await c.execute(`UPDATE properties SET ${keys.map(k=>`${k}=?`).join(",")} WHERE id=?`,[...keys.map(k=>n[k]),d.id]);
    if(d.images!==undefined)await replaceImages(c,d.id,d.images);
   });
   await audit(u!.id,"PROPERTY_UPDATED","property",d.id,{title:old.title,status:old.status},{fields:Object.keys(n),images_changed:d.images!==undefined});
   return Response.json({ok:true});
  }catch(e:any){return bad(e.message||"Unable to update property")}
 },
 DELETE:async({request})=>{
  const u=await getSessionUser(bearer(request));if(!manager(u))return bad("Forbidden",403);
  const {id}=await request.json();await queryRows<any>(`UPDATE properties SET status='archived' WHERE id=?`,[id]);
  await audit(u!.id,"PROPERTY_ARCHIVED","property",id);return Response.json({ok:true});
 }
}}});
