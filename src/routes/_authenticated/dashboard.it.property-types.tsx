import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Plus, Save, Trash2, AlertTriangle } from "lucide-react";
import { DashboardShell, Panel } from "@/components/dashboard/DashboardShell";
import { MediaInput } from "@/components/dashboard/MediaInput";
import { useAuth, dashboardPathFor } from "@/lib/use-auth";
import { navForRoles } from "@/components/dashboard/nav-config";
import type { PropertyTypeRow } from "@/lib/property-types.types";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/it/property-types")({
  head: () => ({ meta: [{ title: "Property Types — NOVAWORKS" }] }),
  component: PropertyTypesAdmin,
});

function PropertyTypesAdmin() {
  const { roles, primaryRole, user } = useAuth();
  const shell = navForRoles(roles);
  const navigate = useNavigate();
  const canEdit = roles.includes("it") || roles.includes("admin");
  useEffect(() => { if (roles.length && !canEdit) navigate({ to: dashboardPathFor(primaryRole) }); }, [roles, canEdit, primaryRole, navigate]);

  const [rows, setRows] = useState<PropertyTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("novaworks_session");
    fetch("/api/property-types", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data?.error || `Could not load property types (${r.status})`); return data; })
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((e) => toast.error(e?.message ?? "Could not load property types"))
      .finally(() => setLoading(false));
  }, []);

  const update = (i: number, patch: Partial<PropertyTypeRow>) => setRows((rs) => rs.map((r, n) => n === i ? { ...r, ...patch } : r));
  const move = (i: number, delta: number) => setRows((rs) => {
    const j = i + delta; if (j < 0 || j >= rs.length) return rs;
    const copy = rs.slice(); [copy[i], copy[j]] = [copy[j], copy[i]]; return copy;
  });
  const add = () => setRows((rs) => [...rs, { key: "", label: "", plural: "", description: "", enabled: true, show_on_home: false }]);

  const errors = useMemo(() => {
    const out: Record<number, string> = {}; const used = new Set<string>();
    rows.forEach((r, i) => {
      const k = r.key.trim().toLowerCase();
      if (!k) out[i] = "Type key is required";
      else if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(k)) out[i] = "Use lowercase letters, numbers and hyphens only";
      else if (used.has(k)) out[i] = "Type key must be unique";
      else used.add(k);
      if (!out[i] && !r.label.trim()) out[i] = "Display name is required";
      if (!out[i] && !r.plural.trim()) out[i] = "Plural name is required";
    });
    return out;
  }, [rows]);

  const save = async () => {
    if (Object.keys(errors).length) return toast.error("Fix the highlighted property types first");
    setSaving(true);
    try {
      const token = localStorage.getItem("novaworks_session");
      const response = await fetch("/api/property-types", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ categories: rows }),
      });
      const result: any = await response.json();
      if (!response.ok) throw new Error(result?.error || `Could not save property types (${response.status})`);
      setRows(result.categories ?? rows);
      toast.success("Property types updated");
    } catch (e: any) { toast.error(e.message ?? "Could not save property types"); }
    finally { setSaving(false); }
  };

  return <DashboardShell title="Property Types" subtitle="Control the property categories available in NOVAWORKS and choose which ones appear on the homepage" role={shell.role} nav={shell.nav}>
    {loading ? <div className="py-24 grid place-items-center text-noir/40"><Loader2 className="h-5 w-5 animate-spin" /></div> : <>
      <div className="grid xl:grid-cols-[minmax(0,1fr)_330px] gap-6 items-start">
        <Panel title={`Property types (${rows.length})`} subtitle="Enable a type for the platform. Turn on 'Homepage' only for the categories you want visitors to see on the home page.">
          <div className="space-y-4">
            {rows.map((r, i) => <div key={`${r.key}-${i}`} className={`rounded-2xl border bg-white p-4 shadow-sm ${errors[i] ? "border-rose-300" : "border-noir/10"}`}>
              <div className="grid lg:grid-cols-[90px_minmax(0,1fr)_auto] gap-4 items-start">
                <div className="flex lg:flex-col gap-2">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="h-9 w-9 grid place-items-center rounded-lg border border-noir/10 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="h-9 w-9 grid place-items-center rounded-lg border border-noir/10 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="text-xs font-semibold text-noir/55">Type key<input className="input-luxe mt-1" value={r.key} onChange={(e) => update(i, { key: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="luxury-apartment" /></label>
                  <label className="text-xs font-semibold text-noir/55">Display name<input className="input-luxe mt-1" value={r.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Luxury Apartment" /></label>
                  <label className="text-xs font-semibold text-noir/55">Plural<input className="input-luxe mt-1" value={r.plural} onChange={(e) => update(i, { plural: e.target.value })} placeholder="Luxury Apartments" /></label>
                  <label className="text-xs font-semibold text-noir/55 md:col-span-2">Short description<input className="input-luxe mt-1" value={r.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="Premium residences with elevated finishes" /></label>
                  <div className="md:col-span-2"><div className="text-xs font-semibold text-noir/55 mb-1">Homepage image</div><MediaInput value={r.image ?? ""} onChange={(image) => update(i, { image })} subdir="property-types" aspect="aspect-[16/9]" userId={user?.id ?? null} previewClassName="max-w-[280px]" /></div>
                </div>
                <div className="min-w-[150px] space-y-2">
                  <Toggle label="Enabled" checked={r.enabled} onChange={(enabled) => update(i, { enabled })} />
                  <Toggle label="Homepage" checked={r.show_on_home} disabled={!r.enabled} onChange={(show_on_home) => update(i, { show_on_home })} />
                  <button onClick={() => setRows((rs) => rs.filter((_, n) => n !== i))} className="w-full mt-2 inline-flex items-center justify-center gap-2 text-xs text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                </div>
              </div>
              {errors[i] && <div className="mt-3 text-xs text-rose-600 flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5" />{errors[i]}</div>}
            </div>)}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button onClick={add} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-noir/15 text-sm"><Plus className="h-4 w-4" /> Add property type</button>
            <button onClick={save} disabled={saving || Object.keys(errors).length > 0} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-soft to-gold text-noir-deep font-semibold disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes</button>
          </div>
        </Panel>
        <div className="xl:sticky xl:top-24"><Panel title="Homepage selection" subtitle="Only these enabled types will appear under Explore Property Types.">
          <div className="space-y-2">{rows.filter((r) => r.enabled && r.show_on_home).map((r) => <div key={r.key} className="rounded-xl border border-noir/10 p-3 flex items-center gap-3"><div className="h-10 w-14 rounded-lg bg-noir/5 overflow-hidden shrink-0">{r.image ? <img src={r.image} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center text-noir/30"><Eye className="h-4 w-4" /></div>}</div><div className="min-w-0"><div className="text-sm font-semibold truncate">{r.plural}</div><div className="text-[11px] text-noir/45 truncate">/{r.key}</div></div></div>)}{rows.filter((r) => r.enabled && r.show_on_home).length === 0 && <div className="text-sm text-noir/45 py-6 text-center"><EyeOff className="h-5 w-5 mx-auto mb-2" />No homepage property types selected.</div>}</div>
        </Panel></div>
      </div>
    </>}
  </DashboardShell>;
}

function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return <button type="button" disabled={disabled} onClick={() => onChange(!checked)} className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold flex items-center justify-between transition ${checked ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-noir/10 bg-noir/[.02] text-noir/50"} disabled:opacity-40`}><span>{label}</span><span className={`h-5 w-9 rounded-full p-0.5 transition ${checked ? "bg-emerald-500" : "bg-noir/15"}`}><span className={`block h-4 w-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : ""}`} /></span></button>;
}
