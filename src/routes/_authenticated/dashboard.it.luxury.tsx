import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, FileCheck, Check, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardShell, Panel } from "@/components/dashboard/DashboardShell";
import { useAuth, dashboardPathFor } from "@/lib/use-auth";
import { listLuxuryRequests, approveLuxuryRequest, denyLuxuryRequest } from "@/lib/luxury.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/it/luxury")({
  head: () => ({ meta: [{ title: "Luxury Access — NOVAWORKS" }] }),
  component: LuxuryRequests,
});

function LuxuryRequests() {
  const { roles, primaryRole } = useAuth();
  const navigate = useNavigate();
  const allowed = roles.includes("it") || roles.includes("admin");
  useEffect(() => { if (roles.length && !allowed) navigate({ to: dashboardPathFor(primaryRole) }); }, [roles, allowed, primaryRole, navigate]);

  const list = useServerFn(listLuxuryRequests);
  const approve = useServerFn(approveLuxuryRequest);
  const deny = useServerFn(denyLuxuryRequest);

  const [rows, setRows] = useState<any[]>([]);
  const refresh = () => list().then((d: any) => setRows(d));
  useEffect(() => { if (allowed) refresh(); }, [allowed]);

  const act = async (id: string, kind: "approve" | "deny") => {
    try {
      if (kind === "approve") await approve({ data: { id } });
      else await deny({ data: { id } });
      toast.success(kind === "approve" ? "Approved & emailed" : "Denied");
      refresh();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  return (
    <DashboardShell
      title="Luxury Access Requests"
      subtitle="Verify and approve visitors who want to view luxury listings"
      role={roles.includes("it") ? "it" : "admin"}
      nav={[
        { to: roles.includes("it") ? "/dashboard/it" : "/dashboard/admin", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
        { to: "/dashboard/it/luxury", label: "Luxury Access", icon: FileCheck, group: "Management" },
      ]}
    >
      <Panel title={`Requests (${rows.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-noir/60 border-b"><th className="py-2">Name</th><th>Email</th><th>Phone</th><th>Reason</th><th>Verified</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 align-top">
                  <td className="py-2">{r.full_name}</td>
                  <td className="truncate max-w-40">{r.email}</td>
                  <td>{r.phone ?? "—"}</td>
                  <td className="max-w-64 truncate">{r.message ?? "—"}</td>
                  <td>{r.email_verified_at ? <span className="text-emerald-600">✓</span> : <span className="text-amber-600">Pending</span>}</td>
                  <td className="capitalize">{r.status}</td>
                  <td className="text-right space-x-2">
                    {r.status === "pending" && r.email_verified_at && (
                      <>
                        <button onClick={() => act(r.id, "approve")} className="text-xs px-2 py-1 rounded bg-emerald-600 text-white inline-flex items-center gap-1"><Check className="h-3 w-3" /> Approve</button>
                        <button onClick={() => act(r.id, "deny")} className="text-xs px-2 py-1 rounded bg-rose-600 text-white inline-flex items-center gap-1"><X className="h-3 w-3" /> Deny</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-noir/50">No requests</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </DashboardShell>
  );
}