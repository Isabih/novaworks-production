import {createFileRoute} from "@tanstack/react-router";
import {bearer,getSessionUser} from "@/lib/auth.server";
import {listRequests,reviewListing} from "@/lib/listing-requests.server";
import {rows} from "@/lib/db-utils.server";
import {queryRows} from "@/lib/mysql.server";
const allowed=(u:any)=>!!u?.roles?.some((r:string)=>["it","admin"].includes(r));
const forbidden=()=>Response.json({error:"Forbidden"},{status:403});
export const Route=createFileRoute("/api/listing-requests/manage")({server:{handlers:{
 GET:async({request})=>{const u=await getSessionUser(bearer(request));if(!allowed(u))return forbidden();return Response.json(await listRequests(),{headers:{"Cache-Control":"no-store"}})},
 POST:async({request})=>{
  const u=await getSessionUser(bearer(request));if(!allowed(u))return forbidden();
  try{
   const d=await request.json();
   if(d.action==="retry_email"){
    await queryRows<any>(`UPDATE listing_email_outbox SET status='pending',next_attempt_at=UTC_TIMESTAMP(),locked_until=NULL WHERE listing_id=? AND status='failed'`,[d.id]);
    return Response.json({ok:true});
   }
   if(d.assigned_admin_id){
    const target=(await rows<any>(`SELECT u.id FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.id=? AND u.active=1 AND r.role IN('it','admin') LIMIT 1`,[d.assigned_admin_id]))[0];
    if(!target)return Response.json({error:"Invalid assignee"},{status:400});
   }
   return Response.json(await reviewListing(d.id,u!.id,d.action,String(d.note||"").slice(0,10000),d.assigned_admin_id));
  }catch(e:any){return Response.json({error:e.message||"Review failed"},{status:400})}
 }
}}});
