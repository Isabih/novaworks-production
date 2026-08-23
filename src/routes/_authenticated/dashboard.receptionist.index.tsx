import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Users, Building2, ShieldCheck, UserPlus, CalendarCheck, Bell, ArrowRight, MessageSquare } from "lucide-react";
import { DashboardShell, Panel, StatCard } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { useAuth } from "@/lib/use-auth";
import { RECEPTIONIST_NAV, shellForStaff } from "@/components/dashboard/nav-config";
import { listCustomers } from "@/lib/customers.functions";
import { listPendingStayExtensions } from "@/lib/stay-extension.functions";
import { getNotifications } from "@/lib/dashboard-data.functions";

export const Route=createFileRoute("/_authenticated/dashboard/receptionist/")({
  head:()=>({meta:[{title:"Reception Dashboard — NOVAWORKS"}]}),
  component:()=> <RoleGate allow={["receptionist","admin","it"]}><ReceptionDashboard/></RoleGate>
});

function ReceptionDashboard(){
  const { roles } = useAuth();
  const shell = roles.includes("it") || roles.includes("admin") ? shellForStaff(roles) : { role: "receptionist" as const, nav: RECEPTIONIST_NAV };
  const list=useServerFn(listCustomers);
  const extensionsFn=useServerFn(listPendingStayExtensions);
  const notificationsFn=useServerFn(getNotifications);
  const [customers,setCustomers]=useState<any[]>([]);
  const [extensions,setExtensions]=useState<any[]>([]);
  const [notifications,setNotifications]=useState<any[]>([]);

  useEffect(()=>{Promise.all([list(),extensionsFn(),notificationsFn()]).then(([c,e,n])=>{
    setCustomers((c??[]) as any[]); setExtensions((e??[]) as any[]); setNotifications((n??[]) as any[]);
  }).catch(()=>{})},[]);

  const stats=useMemo(()=>({
    total:customers.length,
    active:customers.filter(c=>["active","reserved","extension_requested"].includes(c.tenancy_status)).length,
    verified:customers.filter(c=>c.nida_verified_at&&c.email_verified_at).length,
    unread:notifications.filter(n=>!n.read_at).length,
  }),[customers,notifications]);

  return <DashboardShell
    title="Reception Dashboard"
    subtitle="Bookings, customer arrivals, verification and operational alerts at a glance"
    role={shell.role}
    nav={shell.nav}
    actions={[{label:"Register Customer",to:"/dashboard/receptionist/register",icon:UserPlus,variant:"primary"}]}
  >
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard icon={Users} label="Customers" value={String(stats.total)}/>
      <StatCard icon={Building2} label="Active stays" value={String(stats.active)}/>
      <StatCard icon={ShieldCheck} label="Verified identities" value={String(stats.verified)}/>
      <StatCard icon={Bell} label="Unread alerts" value={String(stats.unread)}/>
    </div>

    <div className="mt-6 grid lg:grid-cols-2 gap-6">
      <Panel title="Reception actions" subtitle="The daily workflow stays in one predictable place">
        <div className="grid sm:grid-cols-2 gap-3">
          <Action to="/dashboard/receptionist/register" icon={UserPlus} title="Register customer" text="NIDA/manual identity, email verification and apartment assignment."/>
          <Action to="/dashboard/bookings" icon={CalendarCheck} title="Bookings & payments" text="Approve, decline and confirm customer payments."/>
          <Action to="/dashboard/notifications" icon={Bell} title="Notifications" text="Open booking and email alerts that still need attention."/>
          <Action to="/dashboard/messages" icon={MessageSquare} title="Mail & messages" text="Reply to customers and incoming NOVAWORKS email."/>
        </div>
      </Panel>
      <Panel title="Needs attention" subtitle="Pending stay extensions and unread operational alerts">
        <div className="space-y-3">
          <div className="rounded-xl border border-noir/8 p-4 flex items-center justify-between">
            <div><div className="text-sm font-semibold">Stay extensions</div><div className="text-xs text-noir/45">Requests waiting for a decision</div></div>
            <div className="text-2xl font-semibold">{extensions.length}</div>
          </div>
          <div className="rounded-xl border border-noir/8 p-4 flex items-center justify-between">
            <div><div className="text-sm font-semibold">Unread notifications</div><div className="text-xs text-noir/45">Bookings and email alerts</div></div>
            <div className="text-2xl font-semibold">{stats.unread}</div>
          </div>
          <Link to="/dashboard/notifications" className="inline-flex items-center gap-2 text-sm font-semibold text-gold-dark">Review alerts <ArrowRight className="h-4 w-4"/></Link>
        </div>
      </Panel>
    </div>
  </DashboardShell>
}

function Action({to,icon:Icon,title,text}:{to:string;icon:any;title:string;text:string}){
  return <Link to={to as any} className="group rounded-2xl border border-noir/8 bg-[#fbfaf7] p-4 transition hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-md">
    <div className="h-10 w-10 rounded-xl bg-gold/12 text-gold-dark grid place-items-center"><Icon className="h-5 w-5"/></div>
    <div className="mt-3 text-sm font-semibold">{title}</div><div className="mt-1 text-xs leading-5 text-noir/50">{text}</div>
  </Link>
}
