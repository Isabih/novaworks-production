import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crown, Check, LayoutDashboard, Mail, Star } from "lucide-react";
import { DashboardShell, Panel } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { navForRoles } from "@/components/dashboard/nav-config";
import { useAuth } from "@/lib/use-auth";
import { listPropertiesForPicker, getPropertyOfTheDay, setPropertyOfTheDay } from "@/lib/property-of-day.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/it/property-of-the-day")({
  head: () => ({ meta: [{ title: "Property of the Day — NOVAWORKS" }] }),
  component: () => (
    <RoleGate allow={["it", "admin"]}>
      <Page />
    </RoleGate>
  ),
});

const NAV = [
  { to: "/dashboard/it", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/dashboard/it/system-health", label: "System Health", icon: LayoutDashboard, group: "System" },
  { to: "/dashboard/it/settings", label: "Email Settings", icon: Mail, group: "System" },
  { to: "/dashboard/it/property-of-the-day", label: "Property of the Day", icon: Star, group: "Content" },
];

function Page() {
  const { roles } = useAuth();
  const shell = navForRoles(roles);
  const list = useServerFn(listPropertiesForPicker);
  const get = useServerFn(getPropertyOfTheDay);
  const set = useServerFn(setPropertyOfTheDay);

  const [items, setItems] = useState<any[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([list(), get()])
      .then(([rows, pod]) => {
        setItems(rows);
        setCurrent(pod?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, [list, get]);

  const choose = async (id: string | null) => {
    setSaving(id ?? "clear");
    try {
      await set({ data: { property_id: id } });
      setCurrent(id);
      toast.success(id ? "Property of the Day updated" : "Property of the Day cleared");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update");
    } finally {
      setSaving(null);
    }
  };

  return (
    <DashboardShell title="Property of the Day" subtitle="Choose which property is featured on the homepage" role={shell.role} nav={shell.nav}>
      <Panel title="Current selection" subtitle="Stays on the homepage until you replace it">
        {loading ? (
          <p className="text-noir/60">Loading…</p>
        ) : current ? (
          <div className="flex items-center justify-between">
            <div className="text-noir">
              <span className="text-noir/60 text-sm">Selected:</span>{" "}
              <span className="font-medium">{items.find((i) => i.id === current)?.title ?? "Unknown property"}</span>
            </div>
            <button onClick={() => choose(null)} className="text-sm text-red-600 hover:underline" disabled={saving === "clear"}>
              {saving === "clear" ? "Clearing…" : "Clear selection"}
            </button>
          </div>
        ) : (
          <p className="text-noir/60 text-sm">No property selected. Pick one below.</p>
        )}
      </Panel>

      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p) => {
          const isCurrent = p.id === current;
          return (
            <button
              key={p.id}
              onClick={() => choose(p.id)}
              disabled={saving === p.id}
              className={`text-left bg-white rounded-xl overflow-hidden border transition-all hover:shadow-lg ${isCurrent ? "border-gold ring-2 ring-gold/40" : "border-noir/10"}`}
            >
              <div className="relative aspect-[4/3] bg-noir/10">
                {p.cover && <img src={p.cover} alt={p.title} className="w-full h-full object-cover" />}
                {isCurrent && (
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-gold text-noir-deep text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded">
                    <Crown className="w-3 h-3" /> Current
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="font-medium text-noir line-clamp-1">{p.title}</div>
                <div className="text-xs text-noir/60 mt-1">
                  {p.district ? `${p.district}, ${p.city ?? ""}` : p.city}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-display text-noir">
                    {p.currency === "RWF" ? "RWF" : "$"}
                    {p.price.toLocaleString()}
                  </span>
                  {saving === p.id ? (
                    <span className="text-xs text-noir/60">Saving…</span>
                  ) : isCurrent ? (
                    <span className="inline-flex items-center gap-1 text-xs text-gold font-medium">
                      <Check className="w-3 h-3" /> Selected
                    </span>
                  ) : (
                    <span className="text-xs text-noir/60 hover:text-gold">Set as POD</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </DashboardShell>
  );
}