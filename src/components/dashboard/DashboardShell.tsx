import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { LogOut, Menu, X, Bell, Search, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth, type AppRole } from "@/lib/use-auth";
import { ADMIN_NAV, IT_NAV } from "./nav-config";

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
  feature?: string;
}

export interface HeaderAction {
  label: string;
  to?: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "primary" | "ghost";
}

const ROLE_LABEL: Record<AppRole, string> = {
  customer: "Customer Dashboard",
  agent: "Agent Dashboard",
  owner: "Owner Dashboard",
  admin: "Admin Dashboard",
  it: "IT Dashboard",
  receptionist: "Receptionist Dashboard",
};

export function DashboardShell({
  title,
  subtitle,
  role,
  nav,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  role: AppRole;
  nav?: NavItem[];
  actions?: HeaderAction[];
  children: ReactNode;
}) {
  const { profile, user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [unreadCount,setUnreadCount]=useState(0);
  const lastUnreadCount = useRef<number | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const name = profile?.full_name ?? user?.email ?? "Demo User";
  const initial = name.trim().charAt(0).toUpperCase();
  const path = router.state.location.pathname;
  // Sidebar is LOCKED per role: staff always see the same navigation on every
  // page, so it can never shrink to a page-specific subset.
  const baseNav: NavItem[] = role === "it" ? IT_NAV : role === "admin" ? ADMIN_NAV : (nav ?? []);
  const resolvedNav = useMemo(() => role === "it" ? baseNav : baseNav.filter((item) => !item.feature || featureFlags[item.feature] !== false), [baseNav, featureFlags, role]);
  const groups = Array.from(new Set(resolvedNav.map((n) => n.group ?? "Overview")));

  useEffect(() => {
    const token = localStorage.getItem("novaworks_session");
    if (!token) return;
    fetch("/api/features", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : {})
      .then((v) => setFeatureFlags(v ?? {}))
      .catch(() => undefined);
  }, []);


  useEffect(()=>{const token=localStorage.getItem("novaworks_session");if(!token)return;const load=()=>fetch("/api/notifications-count",{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():{count:0}).then(x=>{const next=Number(x.count||0);if(lastUnreadCount.current===null){if(next>0)toast.info(`${next} unread notification${next===1?"":"s"}`,{description:"Open Notifications to review bookings, email and operational alerts."});}else if(next>lastUnreadCount.current){toast.info("New NOVAWORKS notification",{description:"A new booking, email or operational alert needs your attention.",action:{label:"Open",onClick:()=>{window.location.href="/dashboard/notifications"}}});}lastUnreadCount.current=next;setUnreadCount(next)}).catch(()=>{});load();const t=setInterval(load,15000);return()=>clearInterval(t)},[]);
  useEffect(() => {
    const reset = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => { void signOut(); }, 5 * 60_000);
    };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [signOut]);

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-noir-deep">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-noir-deep text-white flex flex-col transform transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="h-9 w-9 rounded-md gradient-gold flex items-center justify-center text-noir-deep font-display text-lg">N</div>
          <div className="leading-tight flex-1">
            <div className="font-semibold tracking-[.04em] text-lg">NOVAWORKS</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{ROLE_LABEL[role]}</div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-white/60"><X className="h-4 w-4" /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((g) => (
            <div key={g}>
              <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] text-white/40">{g}</div>
              <div className="space-y-1">
                {resolvedNav.filter((n) => (n.group ?? "Overview") === g).map((item) => {
                  const Icon = item.icon;
                  const active = path === item.to || path === `${item.to}/`;
                  return (
                    <Link
                      key={`${g}-${item.to}-${item.label}`}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition ${
                        active ? "bg-gold text-noir-deep font-medium" : "text-white/70 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gold text-noir-deep flex items-center justify-center text-sm font-semibold">{initial}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{name}</div>
            <button onClick={signOut} className="text-[11px] text-white/50 hover:text-white inline-flex items-center gap-1">
              <LogOut className="h-3 w-3" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-[#f7f6f2]/90 backdrop-blur border-b border-noir/5">
          <div className="flex items-center gap-3 px-4 sm:px-8 py-4">
            <button onClick={() => setOpen((v) => !v)} className="lg:hidden p-2 -ml-2"><Menu className="h-5 w-5" /></button>
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-noir/40" />
              <input placeholder="Search..." className="w-full rounded-lg bg-white border border-noir/10 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-gold/50" />
            </div>
            <Link to="/dashboard/notifications" className="relative p-2 rounded-md hover:bg-noir/5"><Bell className={`h-4 w-4 ${unreadCount?"text-gold-dark":""}`} />{unreadCount>0&&<><span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-gold animate-pulse"/><span className="sr-only">{unreadCount} unread notifications</span></>}</Link>
          </div>
        </header>

        <main className="px-4 sm:px-8 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="font-semibold tracking-[-0.025em] text-[1.8rem] text-noir-deep">{title}</h1>
              {subtitle && <p className="text-sm text-noir/60 mt-1">{subtitle}</p>}
            </div>
            {actions && actions.length > 0 && (
              <div className="flex items-center gap-2">
                {actions.map((a) => {
                  const Icon = a.icon;
                  const cls = a.variant === "primary"
                    ? "bg-gold text-noir-deep hover:bg-gold-soft"
                    : "bg-white border border-noir/10 text-noir-deep hover:bg-noir/5";
                  const inner = <>{Icon && <Icon className="h-4 w-4" />} {a.label}</>;
                  return a.to ? (
                    <Link key={a.label} to={a.to} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${cls}`}>{inner}</Link>
                  ) : (
                    <button key={a.label} onClick={a.onClick} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${cls}`}>{inner}</button>
                  );
                })}
              </div>
            )}
          </div>
          {children}
        </main>
      </div>

      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/30 lg:hidden" />}
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  sublabel,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl bg-white border border-noir/5 p-5 shadow-sm relative overflow-hidden">
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-gold/5" />
      <div className="flex items-center justify-between relative">
        <span className="h-10 w-10 rounded-lg bg-gold/15 text-gold flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </span>
        {delta && (
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md ${
            delta.positive === false ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
          }`}>
            {delta.positive === false ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />} {delta.value}
          </span>
        )}
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-noir-deep">{value}</div>
      <div className="mt-1 text-sm font-medium text-noir-deep">{label}</div>
      {sublabel && <div className="text-xs text-noir/50 mt-0.5">{sublabel}</div>}
    </div>
  );
}

export function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white border border-noir/5 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h2 className="font-semibold tracking-[-0.015em] text-lg text-noir-deep">{title}</h2>
          {subtitle && <p className="text-xs text-noir/50 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AnalyticsChart({ data }: { data: Array<{ date: string; views: number; inquiries: number; bookings: number }> }) {
  const [range, setRange] = useState<"7" | "30" | "90">("7");
  const filtered = data.slice(-Number(range));
  return (
    <Panel
      title="Property Analytics"
      subtitle="Views, inquiries, and bookings over time"
      action={
        <div className="inline-flex rounded-lg bg-noir/5 p-1 text-xs">
          {(["7", "30", "90"] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`px-3 py-1 rounded-md ${range === r ? "bg-white text-noir-deep shadow-sm" : "text-noir/60"}`}>
              {r} Days
            </button>
          ))}
        </div>
      }
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filtered}>
            <defs>
              <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
            <Area type="monotone" dataKey="views" stroke="var(--gold)" fill="url(#gViews)" strokeWidth={2} name="Views" />
            <Area type="monotone" dataKey="inquiries" stroke="#3b82f6" fill="transparent" strokeWidth={2} name="Inquiries" />
            <Area type="monotone" dataKey="bookings" stroke="#10b981" fill="transparent" strokeWidth={2} name="Bookings" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export interface QuickAction {
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  tone?: "gold" | "blue" | "violet" | "emerald";
}

const TONE: Record<NonNullable<QuickAction["tone"]>, string> = {
  gold: "bg-gold/15 text-gold",
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
};

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <Panel title="Quick Actions" subtitle="Common tasks and shortcuts">
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          const tone = TONE[a.tone ?? "gold"];
          const inner = (
            <div className="rounded-xl border border-noir/5 p-4 hover:border-gold/40 transition cursor-pointer h-full">
              <span className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="font-medium text-sm text-noir-deep">{a.label}</div>
              <div className="text-xs text-noir/50 mt-0.5">{a.sublabel}</div>
            </div>
          );
          return a.to ? <Link key={a.label} to={a.to}>{inner}</Link> : <div key={a.label}>{inner}</div>;
        })}
      </div>
    </Panel>
  );
}