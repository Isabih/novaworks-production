import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UserPlus, MailCheck, ShieldCheck, Phone, Mail, UserRound, KeyRound } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardShell, Panel } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { shellForStaff } from "@/components/dashboard/nav-config";
import { useAuth } from "@/lib/use-auth";
import { startCreateStaff, verifyAndCreateStaff, resendStaffOtp } from "@/lib/staff.functions";
import { MediaInput } from "@/components/dashboard/MediaInput";
import { toast } from "sonner";
import { StaffOtpModal } from "@/components/auth/StaffOtpModal";
import { cfImage } from "@/lib/cf-image";
import { PasswordStrength } from "@/components/auth/PasswordStrength";

export const Route = createFileRoute("/_authenticated/dashboard/it/staff/new")({
  head: () => ({ meta: [{ title: "Add Staff — NOVAWORKS" }] }),
  component: () => <RoleGate allow={["it", "admin"]}><AddStaff /></RoleGate>,
});

function AddStaff() {
  const { roles, user } = useAuth();
  const isIT = roles.includes("it");
  const shell = shellForStaff(roles);
  const start = useServerFn(startCreateStaff);
  const verify = useServerFn(verifyAndCreateStaff);
  const resend = useServerFn(resendStaffOtp);
  const [form, setForm] = useState({ full_name: "", business_email: "", secondary_email: "", phone: "", password: "", role: "owner" as any, avatar_url: "" });
  const [saving, setSaving] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ email: string; role: string } | null>(null);
  const [pending, setPending] = useState<{ id: string; email: string } | null>(null);
  const allowedRoles = isIT ? ["it", "admin", "owner", "agent", "receptionist"] : ["owner", "agent", "receptionist"];
  const businessRequired = form.role === "admin" || form.role === "it";
  const passwordOk = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{9,}$/.test(form.password);

  const submit = async () => {
    if (!form.full_name || !form.business_email || !form.password) return toast.error("Name, email and password required");
    if (!passwordOk) return toast.error("Password needs 9+ characters, uppercase, lowercase, number and symbol");
    if (businessRequired && !/^[^@\s]+@novaworks\.rw$/i.test(form.business_email)) return toast.error("Admin and IT require a @novaworks.rw business email");
    setSaving(true);
    try {
      const res = await start({ data: { full_name: form.full_name, business_email: form.business_email, secondary_email: form.secondary_email || null, phone: form.phone, password: form.password, role: form.role as any, avatar_url: form.avatar_url || null } });
      setPending({ id: res.pending_id, email: res.email });
      toast.success(`Verification code sent to ${res.email}`);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setSaving(false); }
  };

  return <DashboardShell title="Add Staff Member" subtitle={isIT ? "Create IT, admins, owners, agents or receptionists" : "Create owners, agents, or receptionists"} role={shell.role} nav={shell.nav}>
    {pending && <StaffOtpModal email={pending.email} onClose={() => setPending(null)} onResend={async () => { await resend({ data: { pending_id: pending.id } }); }} onSubmit={async (code: string) => {
      const res = await verify({ data: { pending_id: pending.id, code } });
      setLastCreated({ email: res.email, role: res.role });
      setForm({ full_name: "", business_email: "", secondary_email: "", phone: "", password: "", role: form.role, avatar_url: "" });
      setPending(null); toast.success(`${res.role} account created for ${res.email}`);
    }} />}

    {lastCreated && <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 flex items-start gap-3">
      <MailCheck className="h-5 w-5 text-emerald-700 mt-0.5"/><div className="text-sm"><div className="font-semibold text-emerald-900">{lastCreated.role} account created for {lastCreated.email}</div><p className="text-emerald-800/80 mt-1">Verification is required before first sign in.</p>{isIT&&<Link to="/dashboard/it/users" className="underline text-emerald-900 text-xs mt-1 inline-block">View users →</Link>}</div>
    </div>}

    <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
      <Panel title="Staff details" subtitle="Enter account details. The card on the right updates as you type.">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name" full><input className="input-luxe" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="e.g. Aline Uwase"/></Field>
          <Field label={businessRequired?"NOVAWORKS business email":"Business / primary email"}><input className="input-luxe" type="email" value={form.business_email} onChange={e=>setForm({...form,business_email:e.target.value})} placeholder={businessRequired?"name@novaworks.rw":"name@example.com"}/></Field>
          <Field label="Other email (optional)"><input className="input-luxe" type="email" value={form.secondary_email} onChange={e=>setForm({...form,secondary_email:e.target.value})} placeholder="Personal or secondary email"/></Field>
          <Field label="Phone"><input className="input-luxe" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+250 7XX XXX XXX"/></Field>
          <Field label="Role"><select className="input-luxe capitalize" value={form.role} onChange={e=>setForm({...form,role:e.target.value as any})}>{allowedRoles.map(r=><option key={r} value={r}>{r}</option>)}</select></Field>
          <Field label="Initial password"><input className={`input-luxe transition ${form.password ? (passwordOk ? "!border-emerald-400 focus:!ring-emerald-200" : "!border-rose-400 focus:!ring-rose-200") : ""}`} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="9+ chars with upper, lower, number and symbol"/><PasswordStrength password={form.password}/></Field>
          <Field label="Profile photo" full><MediaInput value={form.avatar_url} onChange={url=>setForm({...form,avatar_url:url})} subdir="avatars" aspect="aspect-square" userId={user?.id??null} previewClassName="max-w-[220px]" /></Field>
        </div>
        <button onClick={submit} disabled={saving} className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-noir-deep text-white text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition disabled:opacity-60 disabled:transform-none"><UserPlus className="h-4 w-4"/>{saving?"Creating…":"Create account"}</button>
      </Panel>

      <div className="xl:sticky xl:top-24">
        <Panel title="Live preview" subtitle="How this staff identity will appear internally.">
          <div className="rounded-3xl bg-noir-deep text-white overflow-hidden shadow-xl">
            <div className="h-20 bg-gradient-to-r from-gold/30 via-gold/10 to-transparent"/>
            <div className="px-6 pb-6 -mt-10">
              {form.avatar_url?<img src={cfImage(form.avatar_url,{width:240,height:240,fit:"cover",quality:72})} className="h-20 w-20 rounded-2xl object-cover ring-4 ring-noir-deep shadow-lg" alt="Preview"/>:<div className="h-20 w-20 rounded-2xl bg-gold text-noir-deep grid place-items-center ring-4 ring-noir-deep text-2xl font-semibold">{(form.full_name||"N").trim().charAt(0).toUpperCase()}</div>}
              <div className="mt-4 text-xl font-semibold tracking-tight">{form.full_name||"Staff member"}</div>
              <div className="mt-1 inline-flex rounded-full bg-gold/15 border border-gold/30 px-2.5 py-1 text-[11px] uppercase tracking-[.16em] text-gold-soft">{form.role}</div>
              <div className="mt-5 space-y-3 text-sm text-white/70">
                <PreviewRow icon={Mail} value={form.business_email||"Business email"}/><PreviewRow icon={Phone} value={form.phone||"Phone number"}/><PreviewRow icon={ShieldCheck} value={businessRequired?"NOVAWORKS domain required":"Standard staff email"}/><PreviewRow icon={KeyRound} value={passwordOk?"Password policy passed":"Password policy pending"}/>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  </DashboardShell>;
}
function Field({label,full,children}:{label:string;full?:boolean;children:React.ReactNode}){return <label className={`block ${full?"sm:col-span-2":""}`}><div className="text-xs font-semibold text-noir/60 mb-1.5">{label}</div>{children}</label>}
function PreviewRow({icon:Icon,value}:{icon:any;value:string}){return <div className="flex items-center gap-2.5"><Icon className="h-4 w-4 text-gold-soft shrink-0"/><span className="truncate">{value}</span></div>}
