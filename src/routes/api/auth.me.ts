import { createFileRoute } from "@tanstack/react-router";
import { bearer, getSessionUser } from "@/lib/auth.server";
export const Route = createFileRoute("/api/auth/me")({ server:{handlers:{GET:async({request})=>{
  const user=await getSessionUser(bearer(request));
  if(!user) return Response.json({error:"Unauthorized"},{status:401});
  return Response.json({user});
}}}});
