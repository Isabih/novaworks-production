import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LayoutDashboard, Mail, Save, Plus, Trash2, Users, Eye, EyeOff, Phone, MapPin, Clock, Quote, Film } from "lucide-react";
import { DashboardShell, Panel } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { navForRoles } from "@/components/dashboard/nav-config";
import { useAuth } from "@/lib/use-auth";
import { MediaInput } from "@/components/dashboard/MediaInput";
import {
  getContactContent,
  updateContactContent,
  type ContactContent,
  type TeamMember,
} from "@/lib/contact-content.functions";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/admin/contact-edit")({
  head: () => ({ meta: [{ title: "Edit Who We Are & Contact — NOVAWORKS" }] }),
  component: () => (
    <RoleGate allow={["admin", "it"]}>
      <ContactEditPage />
    </RoleGate>
  ),
});

function ContactEditPage() {
  const { roles } = useAuth();
  const shell = navForRoles(roles);
  const load = useServerFn(getContactContent);
  const save = useServerFn(updateContactContent);
  const [content, setContent] = useState<ContactContent | null>(null);
  const [original, setOriginal] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(true);
  const [pendingRemove, setPendingRemove] = useState<number | null>(null);
  const [pendingRevert, setPendingRevert] = useState(false);

  useEffect(() => {
    let alive = true;
    load()
      .then((c) => {
        if (!alive) return;
        setContent(c);
        setOriginal(JSON.stringify(c));
      })
      .catch((e: any) => {
        if (!alive) return;
        setLoadError(e?.message ?? "Could not load contact content");
      });
    return () => { alive = false; };
  }, []);

  const dirty = !!content && JSON.stringify(content) !== original;

  // Block in-app navigation when there are unsaved changes
  const blocker = useBlocker({
    shouldBlockFn: ({ next }: any) => dirty && next.pathname !== "/dashboard/admin/contact-edit",
    withResolver: true,
  });
  const navPrompt = blocker.status === "blocked";

  // Warn on browser tab close / hard refresh
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  if (!content) {
    return (
      <DashboardShell title="Edit Who We Are & Contact" role={shell.role} nav={shell.nav}>
        {loadError ? (
          <Panel title="Couldn't load contact content">
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-red-600">{loadError}</p>
              <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-md bg-noir-deep text-white text-sm">Retry</button>
            </div>
          </Panel>
        ) : (
          <Panel title="Loading…"><div className="py-12 text-center text-noir/50 text-sm">Fetching contact content…</div></Panel>
        )}
      </DashboardShell>
    );
  }

  const setCEO = (patch: Partial<ContactContent["ceo"]>) =>
    setContent({ ...content, ceo: { ...content.ceo, ...patch } });
  const setInfo = (patch: Partial<ContactContent["info"]>) =>
    setContent({ ...content, info: { ...content.info, ...patch } });
  const setMember = (i: number, patch: Partial<TeamMember>) => {
    const team = [...content.team];
    team[i] = { ...team[i], ...patch };
    setContent({ ...content, team });
  };
  const addMember = () => setContent({
    ...content,
    team: [...content.team, { name: "New member", role: "Role", image: "" }],
  });
  const removeMember = (i: number) => {
    setContent({ ...content, team: content.team.filter((_, idx) => idx !== i) });
    setPendingRemove(null);
    toast.success("Team member removed (unsaved)");
  };

  const revertChanges = () => {
    setContent(JSON.parse(original));
    setPendingRevert(false);
    toast.info("Changes reverted");
  };
  const moveMember = (i: number, dir: -1 | 1) => {
    const team = [...content.team];
    const j = i + dir;
    if (j < 0 || j >= team.length) return;
    [team[i], team[j]] = [team[j], team[i]];
    setContent({ ...content, team });
  };

  const onSave = async () => {
    if (!content.ceo.image) return toast.error("CEO photo is required");
    if (content.team.some((m) => !m.image)) return toast.error("Every team member needs a photo");
    setSaving(true);
    try {
      await save({ data: content });
      setOriginal(JSON.stringify(content));
      toast.success("Who We Are & Contact updated");
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <DashboardShell
      title="Edit Who We Are & Contact"
      subtitle={dirty ? "Unsaved changes" : "Update CEO, team members and contact details shown on /about and /contact"}
      role={shell.role}
      nav={shell.nav}
      actions={[
        { label: preview ? "Hide preview" : "Show preview", icon: preview ? EyeOff : Eye, onClick: () => setPreview((v) => !v) },
        { label: "Revert", icon: Trash2, onClick: () => dirty ? setPendingRevert(true) : toast.info("Nothing to revert") },
        { label: saving ? "Saving…" : dirty ? "Save changes" : "Saved", icon: Save, variant: "primary", onClick: onSave },
      ]}
    >
      <div className={preview ? "grid xl:grid-cols-2 gap-6" : "space-y-6"}>
        <div className="space-y-6">
        <Panel title="CEO" subtitle="Featured large card at the top of the page">
          <div className="grid sm:grid-cols-[200px_1fr] gap-4">
            <div>
              <div className="text-xs text-noir/60 mb-1.5">Portrait</div>
              <MediaInput value={content.ceo.image} onChange={(url) => setCEO({ image: url })} subdir="contact/ceo" aspect="aspect-[4/5]" />
            </div>
            <div className="space-y-3">
              <Field label="Name"><input className="input-luxe" value={content.ceo.name} onChange={(e) => setCEO({ name: e.target.value })} /></Field>
              <Field label="Title"><input className="input-luxe" value={content.ceo.title} onChange={(e) => setCEO({ title: e.target.value })} /></Field>
              <Field label="Quote"><textarea rows={4} className="input-luxe" value={content.ceo.quote} onChange={(e) => setCEO({ quote: e.target.value })} /></Field>
              <Field label="Footnote (e.g. 'Leading NOVAWORKS since 2014')"><input className="input-luxe" value={content.ceo.since} onChange={(e) => setCEO({ since: e.target.value })} /></Field>
            </div>
          </div>
        </Panel>

        <Panel
          title={`Team (${content.team.length})`}
          subtitle="Cards shown under the CEO"
          action={<button onClick={addMember} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-noir-deep text-white"><Plus className="h-3.5 w-3.5" /> Add member</button>}
        >
          <div className="space-y-4">
            {content.team.map((m, i) => (
              <div key={i} className="grid sm:grid-cols-[140px_1fr_auto] gap-3 items-start border border-noir/10 rounded-lg p-3">
                <MediaInput value={m.image} onChange={(url) => setMember(i, { image: url })} subdir="contact/team" aspect="aspect-square" />
                <div className="space-y-2">
                  <Field label="Name"><input className="input-luxe" value={m.name} onChange={(e) => setMember(i, { name: e.target.value })} /></Field>
                  <Field label="Role"><input className="input-luxe" value={m.role} onChange={(e) => setMember(i, { role: e.target.value })} /></Field>
                </div>
                <div className="flex sm:flex-col gap-1 text-xs">
                  <button onClick={() => moveMember(i, -1)} disabled={i === 0} className="px-2 py-1 rounded border disabled:opacity-30">↑</button>
                  <button onClick={() => moveMember(i, 1)} disabled={i === content.team.length - 1} className="px-2 py-1 rounded border disabled:opacity-30">↓</button>
                  <button onClick={() => setPendingRemove(i)} className="px-2 py-1 rounded border text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
            {content.team.length === 0 && <p className="text-sm text-noir/50 text-center py-6">No team members yet — click "Add member".</p>}
          </div>
        </Panel>

        <Panel title="Contact details" subtitle="Phone, email, address, hours">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Phone"><input className="input-luxe" value={content.info.phone} onChange={(e) => setInfo({ phone: e.target.value })} /></Field>
            <Field label="Phone hours"><input className="input-luxe" value={content.info.phone_hours} onChange={(e) => setInfo({ phone_hours: e.target.value })} /></Field>
            <Field label="Email"><input className="input-luxe" value={content.info.email} onChange={(e) => setInfo({ email: e.target.value })} /></Field>
            <Field label="Email note"><input className="input-luxe" value={content.info.email_note} onChange={(e) => setInfo({ email_note: e.target.value })} /></Field>
            <Field label="Address"><input className="input-luxe" value={content.info.address} onChange={(e) => setInfo({ address: e.target.value })} /></Field>
            <Field label="Address note"><input className="input-luxe" value={content.info.address_note} onChange={(e) => setInfo({ address_note: e.target.value })} /></Field>
            <Field label="Office hours"><input className="input-luxe" value={content.info.hours} onChange={(e) => setInfo({ hours: e.target.value })} /></Field>
            <Field label="Hours note"><input className="input-luxe" value={content.info.hours_note} onChange={(e) => setInfo({ hours_note: e.target.value })} /></Field>
          </div>
        </Panel>
        </div>

        {preview && (
          <div className="xl:sticky xl:top-4 xl:self-start">
            <Panel title="Live preview" subtitle="Preview of leadership/contact content (unsaved changes included)">
              <ContactPreview content={content} />
            </Panel>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        {dirty && <span className="text-xs text-amber-600">You have unsaved changes</span>}
        <button onClick={onSave} disabled={saving || !dirty} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-gold text-noir-deep font-medium disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <AlertDialog open={pendingRemove !== null} onOpenChange={(o) => !o && setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemove !== null && (
                <>This will remove <strong>{content.team[pendingRemove]?.name}</strong> from the team section. The change is unsaved until you click <em>Save changes</em>.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingRemove !== null && removeMember(pendingRemove)} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingRevert} onOpenChange={setPendingRevert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert all unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard every change you've made since the last save. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={revertChanges} className="bg-red-600 hover:bg-red-700">Revert</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={navPrompt} onOpenChange={(o) => { if (!o) blocker.reset?.(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave with unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits on the contact page. Leaving now will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={() => blocker.proceed?.()} className="bg-red-600 hover:bg-red-700">
              Discard & leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}

const nav = [
  { to: "/dashboard/admin", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/dashboard/admin/contact-edit", label: "Who We Are & Contact", icon: Mail, group: "Content" },
  { to: "/dashboard/admin/portfolio-videos", label: "Portfolio Videos", icon: Film, group: "Content" },
  { to: "/dashboard/it/staff/new", label: "Add Staff", icon: Users, group: "Management" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-xs font-medium text-noir/60 mb-1">{label}</div>{children}</label>;
}

function ContactPreview({ content }: { content: ContactContent }) {
  const { ceo, team, info } = content;
  return (
    <div className="bg-gradient-to-b from-background to-muted/30 rounded-lg overflow-hidden border border-noir/10">
      {/* Hero */}
      <div className="bg-noir-deep text-white px-5 py-7">
        <div className="text-[10px] uppercase tracking-[0.2em] text-gold">Get In Touch</div>
        <div className="mt-2 font-display text-2xl">Let's start a conversation.</div>
      </div>
      {/* CEO */}
      <div className="p-5">
        <div className="grid grid-cols-[100px_1fr] gap-4 items-center bg-card border border-gold/30 rounded-xl p-4">
          {ceo.image ? (
            <img src={ceo.image} alt={ceo.name} className="w-full aspect-[4/5] rounded-md object-cover object-top ring-2 ring-gold/40" />
          ) : (
            <div className="w-full aspect-[4/5] rounded-md bg-noir/10 grid place-items-center text-noir/40 text-xs">No photo</div>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-gold">{ceo.title || "—"}</div>
            <div className="mt-1 font-display text-lg text-foreground leading-tight">{ceo.name || "—"}</div>
            <Quote className="w-4 h-4 text-gold/50 mt-2" />
            <div className="mt-1 italic text-xs text-foreground line-clamp-3">"{ceo.quote || "—"}"</div>
            {ceo.since && <div className="mt-1.5 text-[10px] text-muted-foreground">{ceo.since}</div>}
          </div>
        </div>

        {/* Team grid */}
        {team.length > 0 && (
          <div className="mt-5 grid grid-cols-3 gap-3">
            {team.map((m, i) => (
              <div key={i} className="bg-card border border-gold/20 rounded-lg p-3 text-center">
                {m.image ? (
                  <img src={m.image} alt={m.name} className="w-16 h-16 mx-auto rounded-full object-cover ring-2 ring-gold/30" />
                ) : (
                  <div className="w-16 h-16 mx-auto rounded-full bg-noir/10 grid place-items-center text-[10px] text-noir/40">No img</div>
                )}
                <div className="mt-2 font-display text-xs text-foreground line-clamp-1">{m.name || "—"}</div>
                <div className="text-[9px] uppercase tracking-wider text-gold line-clamp-1">{m.role || "—"}</div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          {[
            { i: Phone, t: "Call", v: info.phone, s: info.phone_hours },
            { i: Mail, t: "Email", v: info.email, s: info.email_note },
            { i: MapPin, t: "Visit", v: info.address, s: info.address_note },
            { i: Clock, t: "Hours", v: info.hours, s: info.hours_note },
          ].map((c) => (
            <div key={c.t} className="flex gap-2 p-2.5 bg-card border border-border rounded-md">
              <div className="w-7 h-7 rounded bg-gold/10 text-gold grid place-items-center shrink-0">
                <c.i className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{c.t}</div>
                <div className="text-xs font-medium text-foreground truncate">{c.v || "—"}</div>
                <div className="text-[10px] text-muted-foreground truncate">{c.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}