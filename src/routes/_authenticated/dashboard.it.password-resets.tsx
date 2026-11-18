import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardShell, Panel } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/lib/use-auth";
import { listPasswordResetRequests, approvePasswordReset, denyPasswordReset } from "@/lib/password-reset.functions";
import { toast } from "sonner";
export const Route=createFileRoute("/_authenticated/dashboard/it/password-resets")({component:Page});
function Page(){
 const {roles}=useAuth(),list=useServerFn(listPasswordResetRequests),approve=useServerFn(approvePasswordReset),deny=useServerFn(denyPasswordReset);
 const [items,setItems]=useState<any[]>([]),[reasons,setReasons]=useState<Record<string,string>>({}),[busy,setBusy]=useState("");
 const refresh=()=>list().then((r:any)=>setItems(r)).catch((e:any)=>toast.error(e.message));
 useEffect(()=>{if(roles.includes("it"))void refresh()},[roles.join(",")]);
 const act=async(id:string,kind:"approve"|"deny")=>{const reason=(reasons[id]||"").trim();if(reason.length<5)return toast.error("Enter a reason of at least 5 characters");setBusy(id);try{await (kind==="approve"?approve({data:{id,reason}}):deny({data:{id,reason}}));toast.success("Decision recorded");await refresh()}catch(e:any){toast.error(e.message||"Action failed")}finally{setBusy("")}};
 return <DashboardShell title="Password Security Requests" subtitle="Only email-verified requests may be approved" role="it">
 <Panel title="Requests"><div className="space-y-4">{items.map(r=><section key={r.id} className="border rounded-xl p-4 space-y-2">
 <p className="font-semibold">{r.email} — {r.request_type}</p><p className="text-sm">Reason: {r.reason}</p><p className="text-sm">Status: {r.status}</p>
 {r.status==="email_verified"&&<><textarea className="input-luxe w-full" placeholder="Mandatory IT decision reason" value={reasons[r.id]||""} onChange={e=>setReasons(v=>({...v,[r.id]:e.target.value}))}/>
 <div className="flex gap-2"><button className="px-4 py-2 bg-emerald-700 text-white rounded" disabled={busy===r.id} onClick={()=>act(r.id,"approve")}>Approve</button>
 <button className="px-4 py-2 bg-rose-700 text-white rounded" disabled={busy===r.id} onClick={()=>act(r.id,"deny")}>Reject</button></div></>}
 </section>)}{items.length===0&&<p>No requests</p>}</div></Panel></DashboardShell>;
}
