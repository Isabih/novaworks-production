import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CheckCheck, CalendarCheck, Mail, Wrench, MessageSquare, ArrowUpRight } from "lucide-react";
import { DashboardShell, Panel } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/lib/use-auth";
import { navForRoles } from "@/components/dashboard/nav-config";
import { getNotifications, markNotificationsRead } from "@/lib/dashboard-data.functions";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({ component: Page });
const iconFor = (type: string) => type.includes("booking") ? CalendarCheck : type === "mail" ? Mail : type.includes("service") ? Wrench : type.includes("visit") ? CalendarCheck : MessageSquare;
const targetFor = (type: string) => type === "mail" ? "/dashboard/messages" : type.includes("booking") ? "/dashboard/bookings" : type.includes("service") ? "/dashboard/service-requests" : type.includes("visit") ? "/dashboard/admin/visit-tasks" : null;

function Page() {
  const { roles } = useAuth(); const shell = navForRoles(roles); const navigate = useNavigate();
  const list = useServerFn(getNotifications); const mark = useServerFn(markNotificationsRead);
  const [items, setItems] = useState<any[]>([]); const load = () => list().then((r:any)=>setItems(r));
  useEffect(()=>{ load(); },[]); const unread = items.filter(x=>!x.read_at).length;
  return <DashboardShell title="Notifications" subtitle={`${unread} unread · bookings, email and operational alerts`} role={shell.role} nav={shell.nav} actions={[{label:"Mark all read",icon:CheckCheck,onClick:async()=>{await mark({data:{ids:items.filter(x=>!x.read_at).map(x=>x.id),action:"mark_all_read"}});load();}}]}>
    <div className="grid gap-3">{items.map(n=>{const I=iconFor(n.type),to=targetFor(n.type);return <button key={n.id} onClick={async()=>{if(!n.read_at)await mark({data:{ids:[n.id],action:to?`opened_to:${to}`:"opened"}});if(to)navigate({to:to as any});else load();}} className={`group text-left rounded-2xl border bg-white p-4 flex gap-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${n.read_at?"border-noir/5":"border-gold/30 shadow-sm"}`}><div className={`h-11 w-11 rounded-xl grid place-items-center shrink-0 ${n.read_at?"bg-noir/5 text-noir/40":"bg-gold/15 text-gold-dark"}`}><I className="h-5 w-5"/></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><div className="font-semibold truncate">{n.title}</div>{!n.read_at&&<span className="h-2 w-2 rounded-full bg-gold animate-pulse shrink-0"/>}</div><div className="text-sm text-noir/55 mt-1 line-clamp-2">{n.message}</div><div className="text-[11px] text-noir/35 mt-2">{new Date(n.created_at).toLocaleString()}</div></div>{to&&<ArrowUpRight className="h-4 w-4 text-noir/25 group-hover:text-gold-dark transition shrink-0"/>}</button>})}{!items.length&&<Panel title="Inbox"><div className="py-16 text-center text-noir/40"><Bell className="h-9 w-9 mx-auto mb-3"/>No notifications yet.</div></Panel>}</div>
  </DashboardShell>;
}
