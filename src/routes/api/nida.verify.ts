import { createFileRoute } from "@tanstack/react-router";
import { bearer,getSessionUser } from "@/lib/auth.server";
import { verifyNida } from "@/lib/nida.server";
export const Route=createFileRoute("/api/nida/verify")({server:{handlers:{POST:async({request})=>{const user=await getSessionUser(bearer(request));if(!user||!user.roles.some((r:string)=>["receptionist","admin","it"].includes(r)))return Response.json({error:"Unauthorized"},{status:401});const b=await request.json() as any;try{return Response.json(await verifyNida(String(b.nid||"").trim()))}catch(e:any){return Response.json({error:e.message||"NIDA verification failed"},{status:400})}}}}});
