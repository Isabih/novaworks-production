import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { KeyRound, Power, Save, X, BadgeCheck, AlertCircle, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardShell, Panel } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { shellForStaff } from "@/components/dashboard/nav-config";
import { useAuth } from "@/lib/use-auth";
import { listAllUsers, updateUserProfile, updateUserRoles, itTriggerPasswordReset, deleteUser } from "@/lib/staff.functions";
import { MediaInput } from "@/components/dashboard/MediaInput";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/it/users")({
  head: () => ({ meta: [{ title: "Users — NOVAWORKS" }] }),
  component: () => (
    <RoleGate allow={["it", "admin"]}>
      <UsersPage />
    </RoleGate>
  ),
});

const ALL_ROLES = ["admin", "it", "receptionist", "owner", "agent", "customer"] as const;

function UsersPage() {
  const { roles, user } = useAuth();
  const isIT = roles.includes("it");
  const shell = shellForStaff(roles);

  const load = useServerFn(listAllUsers);
  const updProfile = useServerFn(updateUserProfile);
  const updRoles = useServerFn(updateUserRoles);
  const triggerReset = useServerFn(itTriggerPasswordReset);
  const removeUser = useServerFn(deleteUser);

  const [users, setUsers] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "unverified">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const refresh = () => load().then((d: any) => setUsers(d));
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (verifiedFilter === "verified" && !u.email_confirmed_at) return false;
      if (verifiedFilter === "unverified" && u.email_confirmed_at) return false;
      if (roleFilter !== "all" && !(u.roles ?? []).includes(roleFilter)) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!(u.full_name ?? "").toLowerCase().includes(q) && !(u.email ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [users, verifiedFilter, roleFilter, query]);

  const save = async () => {
    if (!editing) return;
    try {
      await updProfile({ data: { user_id: editing.id, full_name: editing.full_name, phone: editing.phone, avatar_url: editing.avatar_url } });
      await updRoles({ data: { user_id: editing.id, roles: editing.roles } });
      toast.success("Saved");
      setEditing(null);
      refresh();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  const toggleActive = async (u: any) => {
    try {
      await updProfile({ data: { user_id: u.id, active: !u.active } });
      toast.success(u.active ? "Deactivated" : "Reactivated");
      refresh();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  const reset = async (u: any) => {
    if (!confirm(`Trigger password reset for ${u.email}? It will appear in the password-reset queue.`)) return;
    try {
      await triggerReset({ data: { user_id: u.id } });
      toast.success("Reset request created — approve in Password Resets");
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  const remove = async (u: any) => {
    if (!confirm(`Permanently delete ${u.full_name || u.email}? This cannot be undone.`)) return;
    if (!confirm(`Type-of-check: really delete ${u.email}? All their data will be removed.`)) return;
    try {
      await removeUser({ data: { user_id: u.id } });
      toast.success("User deleted");
      refresh();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  return (
    <DashboardShell
      title="User Management"
      subtitle="View, edit, deactivate, and reset passwords"
      role={shell.role}
      nav={shell.nav}
    >
      <Panel title={`All Users (${filtered.length} / ${users.length})`}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            className="text-sm border border-noir/15 rounded-md px-3 py-1.5 flex-1 min-w-48"
          />
          <select value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value as any)} className="text-sm border border-noir/15 rounded-md px-2 py-1.5">
            <option value="all">All emails</option>
            <option value="verified">✓ Verified only</option>
            <option value="unverified">Unverified only</option>
          </select>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="text-sm border border-noir/15 rounded-md px-2 py-1.5">
            <option value="all">All roles</option>
            {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-noir/60 border-b"><th className="py-2">Name</th><th>Email</th><th>Verified</th><th>Roles</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-2 flex items-center gap-2">
                    {u.avatar_url ? <img src={u.avatar_url} className="h-7 w-7 rounded-full object-cover" alt="" /> : <div className="h-7 w-7 rounded-full bg-noir/10" />}
                    {u.full_name || "—"}
                  </td>
                  <td className="truncate max-w-48">{u.email}</td>
                  <td>
                    {u.email_confirmed_at ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <BadgeCheck className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertCircle className="h-3 w-3" /> Unverified
                      </span>
                    )}
                  </td>
                  <td className="text-xs">{u.roles.join(", ") || "—"}</td>
                  <td>{u.active === false ? <span className="text-rose-600">Disabled</span> : <span className="text-emerald-600">Active</span>}</td>
                  <td className="text-right space-x-2">
                    <button onClick={() => setEditing({ ...u, roles: [...u.roles] })} className="text-xs underline">Edit</button>
                    <button onClick={() => toggleActive(u)} className="text-xs underline"><Power className="inline h-3 w-3" /> {u.active === false ? "Enable" : "Disable"}</button>
                    <button onClick={() => reset(u)} className="text-xs underline"><KeyRound className="inline h-3 w-3" /> Reset</button>
                    {u.id !== user?.id && (
                      <button onClick={() => remove(u)} className="text-xs underline text-rose-600 hover:text-rose-700"><Trash2 className="inline h-3 w-3" /> Delete</button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-noir/50">No users match the filters</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      {editing && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 md:p-7 relative shadow-2xl max-h-[92vh] overflow-y-auto">
            <button onClick={() => setEditing(null)} className="absolute top-4 right-4 h-9 w-9 rounded-full border border-noir/10 grid place-items-center hover:bg-noir/5"><X className="h-4 w-4" /></button>
            <div className="pr-12">
              <h3 className="font-display text-2xl">Edit user</h3>
              <p className="text-sm text-noir/50 mt-1">Update profile information, avatar and role access without leaving user management.</p>
            </div>
            <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block"><div className="text-xs font-semibold text-noir/55 mb-1.5">Full name</div><input className="input-luxe" value={editing.full_name ?? ""} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} /></label>
                  <label className="block"><div className="text-xs font-semibold text-noir/55 mb-1.5">Phone</div><input className="input-luxe" value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></label>
                </div>
                <div className="rounded-2xl border border-noir/10 p-4">
                  <div className="text-xs font-semibold text-noir/55 mb-2">Roles & access</div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_ROLES.map((r) => {
                      const on = editing.roles.includes(r);
                      const restricted = (r === "admin" || r === "it") && !isIT;
                      return <button key={r} disabled={restricted} onClick={() => setEditing({ ...editing, roles: on ? editing.roles.filter((x: string) => x !== r) : [...editing.roles, r] })} className={`text-xs px-3 py-1.5 rounded-full border transition ${on ? "bg-noir-deep text-white border-noir-deep" : "bg-white border-noir/15 hover:border-gold/50"} disabled:opacity-40`}>{r}</button>;
                    })}
                  </div>
                  {!isIT && <p className="text-xs text-noir/50 mt-2">Only IT can grant IT or admin roles.</p>}
                </div>
                <button onClick={save} className="inline-flex justify-center items-center gap-2 px-5 py-3 rounded-xl bg-noir-deep text-white text-sm font-semibold shadow-sm"><Save className="h-4 w-4" /> Save changes</button>
              </div>
              <div className="rounded-2xl border border-noir/10 bg-[#faf9f6] p-4">
                <div className="text-xs font-semibold text-noir/55 mb-2">Profile photo</div>
                <MediaInput value={editing.avatar_url ?? ""} onChange={(url) => setEditing({ ...editing, avatar_url: url })} subdir="avatars" aspect="aspect-square" userId={user?.id ?? null} previewClassName="max-w-[220px] mx-auto" />
                <div className="mt-4 text-center">
                  <div className="font-semibold">{editing.full_name || "User name"}</div>
                  <div className="text-xs text-noir/45 mt-1">{editing.email}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardShell>
  );
}