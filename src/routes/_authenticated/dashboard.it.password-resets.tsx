import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, KeyRound, Check, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardShell, Panel } from "@/components/dashboard/DashboardShell";
import { useAuth, dashboardPathFor } from "@/lib/use-auth";
import { listPasswordResetRequests, approvePasswordReset, denyPasswordReset } from "@/lib/password-reset.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/it/password-resets")({
  head: () => ({ meta: [{ title: "Password Resets — NOVAWORKS" }] }),
  component: PasswordResets,
});

function PasswordResets() {
  const { roles, primaryRole } = useAuth();
  const navigate = useNavigate();
  const allowed = roles.includes("it");
  useEffect(() => { if (roles.length && !allowed) navigate({ to: dashboardPathFor(primaryRole) }); }, [roles, allowed, primaryRole, navigate]);

  const list = useServerFn(listPasswordResetRequests);
  const approve = useServerFn(approvePasswordReset);
  const deny = useServerFn(denyPasswordReset);
  const [rows, setRows] = useState<any[]>([]);
  const refresh = () => list().then((d: any) => setRows(d));
  useEffect(() => { if (allowed) refresh(); }, [allowed]);

  const act = async (id: string, kind: "approve" | "deny") => {
    try {
      if (kind === "approve") await approve({ data: { id } });
      else await deny({ data: { id } });
      toast.success(kind === "approve" ? "One-time password emailed" : "Denied");
      refresh();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  return (
    <DashboardShell
      title="Password Reset Queue"
      subtitle="Email-verified users awaiting a one-time password"
      role="it"
    >
      <Panel title={`Requests (${rows.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-noir/60 border-b"><th className="py-2">Email</th><th>Reason</th><th>Status</th><th>Requested</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 truncate max-w-48">{r.email}</td>
                  <td><span className="text-xs text-noir/60">{r.reason}</span></td>
                  <td className="capitalize">{r.status}</td>
                  <td className="text-xs text-noir/60">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="text-right space-x-2">
                    {r.status === "pending" && (
                      <>
                        <button onClick={() => act(r.id, "approve")} className="text-xs px-2 py-1 rounded bg-emerald-600 text-white inline-flex items-center gap-1"><Check className="h-3 w-3" /> Email new password</button>
                        <button onClick={() => act(r.id, "deny")} className="text-xs px-2 py-1 rounded bg-rose-600 text-white inline-flex items-center gap-1"><X className="h-3 w-3" /> Deny</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-noir/50">No requests</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </DashboardShell>
  );
}