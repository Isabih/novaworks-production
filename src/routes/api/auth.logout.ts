import { createFileRoute } from "@tanstack/react-router";
import { bearer, revokeSession } from "@/lib/auth.server";
export const Route=createFileRoute("/api/auth/logout")({server:{handlers:{POST:async({request})=>{
 const token=bearer(request); if(token) await revokeSession(token); return Response.json({ok:true});
}}}});
