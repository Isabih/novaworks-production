import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Heart, CalendarCheck, MessageSquare, Clock, AlertCircle, Mail, Phone, CalendarPlus } from "lucide-react";
import { DashboardShell, StatCard, Panel } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { BUYER_NAV } from "@/components/dashboard/nav-config";
import { getCustomerDashboard } from "@/lib/dashboard-data.functions";

export const Route=createFileRoute("/_authenticated/dashboard/buyer/")({component:()=> <RoleGate allow={["customer"]} exclusive><Page/></RoleGate>});

function Page(){
  const fn=useServerFn(getCustomerDashboard);
  const [d,setD]=useState<any>({services:[]});
  useEffect(()=>{void fn().then(setD)},[]);
  const stay=d.stay;
  const days=Math.max(0,Number(stay?.days_remaining||0));
  const totalDays=stay?Math.max(1,Math.ceil((new Date(stay.end_date).getTime()-new Date(stay.start_date).getTime())/86400000)):1;
  const pct=stay?Math.max(0,Math.min(100,(days/totalDays)*100)):0;
  return <DashboardShell title="Customer Dashboard" subtitle="Your stay, requests, visits and property activity" role="customer" nav={BUYER_NAV}>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={Heart} label="Saved properties" value={String(d.saved||0)}/><StatCard icon={CalendarCheck} label="Visits" value={String(d.visits||0)}/><StatCard icon={MessageSquare} label="Inquiries" value={String(d.inquiries||0)}/><StatCard icon={Clock} label="Days remaining" value={stay?String(days):"—"}/>
    </div>
    <div className="grid lg:grid-cols-2 gap-6 mt-6">
      <Panel title="Current stay">{stay?<><div className="font-display text-2xl">{stay.property_title}</div><div className="text-sm text-noir/55">Unit {stay.apartment_code} • {stay.status}</div><div className="h-2 rounded-full bg-noir/10 overflow-hidden mt-5"><div className="h-full bg-emerald-500 transition-all" style={{width:`${pct}%`}}/></div><div className="text-xs text-noir/50 mt-2">{days} days remaining • ends {String(stay.end_date).slice(0,10)}</div><div className="mt-5 flex flex-wrap gap-2"><a href="/dashboard/buyer/bookings?mode=extension" className="inline-flex items-center gap-2 rounded-lg bg-noir-deep px-4 py-2 text-xs font-semibold text-white"><CalendarPlus className="h-4 w-4"/>Extend stay & pay</a><a href="/dashboard/buyer/bookings" className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold">Book another property</a></div><p className="mt-3 text-xs text-noir/45">Extensions become active only after payment and Reception confirmation.</p></>:<p className="text-sm text-noir/50">No active stay.</p>}</Panel>
      <Panel title="Recent service requests">{d.services?.length?d.services.map((s:any)=><div key={s.id} className="py-3 border-b last:border-0 flex gap-3"><AlertCircle className="h-4 w-4 mt-1"/><div><div className="text-sm font-medium">{s.title}</div><div className="text-xs text-noir/50">{s.priority} • {s.status}{s.admin_response?` • ${s.admin_response}`:""}</div>{s.expected_at&&<div className="mt-1 text-xs text-emerald-700">Expected action: {new Date(s.expected_at).toLocaleString()}</div>}</div></div>):<p className="text-sm text-noir/50">No service requests.</p>}</Panel>
    </div>
    <div className="mt-6"><Panel title="NOVAWORKS contact" subtitle="Reply to any NOVAWORKS email or use these contacts for help"><div className="grid sm:grid-cols-2 gap-3"><a href={`mailto:${d.contact?.email||"info@novaworks.rw"}`} className="rounded-xl border p-4 flex items-center gap-3"><Mail className="h-5 w-5 text-gold-dark"/><div><div className="text-xs text-noir/45">Email</div><b>{d.contact?.email||"info@novaworks.rw"}</b></div></a><a href={`tel:${String(d.contact?.phone||"").replace(/\s/g,"")}`} className="rounded-xl border p-4 flex items-center gap-3"><Phone className="h-5 w-5 text-gold-dark"/><div><div className="text-xs text-noir/45">Reception</div><b>{d.contact?.phone||"+250 788 000 000"}</b></div></a></div></Panel></div>
  </DashboardShell>
}
