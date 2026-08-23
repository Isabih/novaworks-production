import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Plus, LayoutDashboard, Trash2, Eye, Pencil, RefreshCw, Boxes } from "lucide-react";
import { DashboardShell, Panel } from "@/components/dashboard/DashboardShell";
import { useAuth, dashboardPathFor } from "@/lib/use-auth";
import { fetchMyProperties, deleteProperty, setPropertyStatus } from "@/lib/properties-db";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/properties/")({
  head: () => ({ meta: [{ title: "My Properties — NOVAWORKS" }] }),
  component: PropertiesList,
});

const NAV = [
  { to: "/dashboard/it", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/dashboard/properties", label: "All Properties", icon: Building2, group: "Content" },
  { to: "/dashboard/properties/new", label: "Add Property", icon: Plus, group: "Content" },
];

function PropertiesList() {
  const { primaryRole, roles } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const canManage = roles.includes("it") || roles.includes("admin");

  useEffect(() => {
    if (roles.length && !canManage) {
      toast.error("Only NOVAWORKS staff can manage properties.");
      navigate({ to: dashboardPathFor((primaryRole as any) ?? "customer") });
    }
  }, [roles, canManage, primaryRole, navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMyProperties();
      setRows(data);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this property? This cannot be undone.")) return;
    try { await deleteProperty(id); toast.success("Property deleted"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleStatusChange = async (id: string, next: string) => {
    // Optimistic update so the table reflects instantly.
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
    try {
      await setPropertyStatus(id, next);
      toast.success(`Status updated to ${next}`);
    } catch (e: any) {
      toast.error(e.message);
      load();
    }
  };

  const STATUS_STYLES: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    sold: "bg-rose-50 text-rose-700 border-rose-200",
    maintenance: "bg-amber-50 text-amber-700 border-amber-200",
    draft: "bg-noir/5 text-noir/60 border-noir/10",
    rented: "bg-blue-50 text-blue-700 border-blue-200",
  };

  const role = (canManage ? (roles.includes("it") ? "it" : "admin") : (primaryRole as any) ?? "customer");

  return (
    <DashboardShell
      title="All Properties"
      subtitle="NOVAWORKS-managed listings · IT & admin only"
      role={role}
      nav={[...NAV, { to: dashboardPathFor(role), label: "Back to dashboard", icon: LayoutDashboard, group: "Overview" }]}
      actions={[
        { label: "Refresh", icon: RefreshCw, onClick: load },
        { label: "Add Property", to: "/dashboard/properties/new", icon: Plus, variant: "primary" },
      ]}
    >
      <Panel title={`${rows.length} ${rows.length === 1 ? "property" : "properties"}`} subtitle="All listings on the NOVAWORKS platform">
        {loading ? (
          <p className="text-sm text-noir/50">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="text-center py-10">
            <Building2 className="h-10 w-10 mx-auto text-noir/20" />
            <p className="mt-3 text-sm text-noir/60">No properties on the platform yet.</p>
            <Link to="/dashboard/properties/new" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-noir-deep">
              <Plus className="h-4 w-4" /> Add first property
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-noir/50 border-b border-noir/5">
                  <th className="py-3 pr-4">Property</th>
                  <th className="py-3 pr-4">Location</th>
                  <th className="py-3 pr-4">Price</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Views</th>
                  <th className="py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const cover = p.property_images?.find((i: any) => i.is_cover) ?? p.property_images?.[0];
                  return (
                    <tr key={p.id} className="border-b border-noir/5 last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-14 rounded-md bg-noir/5 overflow-hidden">
                            {cover ? <img src={cover.url} alt="" className="h-full w-full object-cover" /> : null}
                          </div>
                          <div>
                            <div className="font-medium">{p.title}</div>
                            <div className="text-xs text-noir/50">{p.property_type} · {p.listing_type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-noir/70">{p.city ?? "—"}</td>
                      <td className="py-3 pr-4 font-medium">{p.currency} {Number(p.price).toLocaleString()}</td>
                      <td className="py-3 pr-4">
                        <select
                          value={p.status}
                          onChange={(e) => handleStatusChange(p.id, e.target.value)}
                          className={`text-xs font-medium px-2 py-1 rounded border outline-none cursor-pointer ${STATUS_STYLES[p.status] ?? STATUS_STYLES.draft}`}
                        >
                          <option value="draft">Draft (hidden)</option>
                          <option value="active">Available · Published</option>
                          <option value="sold">Sold</option>
                          <option value="rented">Rented</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </td>
                      <td className="py-3 pr-4 text-noir/70">{p.views_count ?? 0}</td>
                      <td className="py-3 flex items-center gap-2">
                        <Link to="/properties/$slug" params={{ slug: p.slug }} className="p-1.5 rounded hover:bg-noir/5" title="View"><Eye className="h-4 w-4" /></Link><Link to="/dashboard/properties/$propertyId/units" params={{propertyId:p.id}} className="p-1.5 rounded hover:bg-noir/5" title="Manage units"><Boxes className="h-4 w-4"/></Link>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-rose-50 text-rose-500" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </DashboardShell>
  );
}