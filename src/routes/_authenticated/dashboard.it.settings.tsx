import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Settings, LayoutDashboard, Mail, Save, Send, Star } from "lucide-react";
import { DashboardShell, Panel } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/lib/use-auth";
import { getAppSettings, updateAppSettings } from "@/lib/app-settings.functions";
import { sendCustomEmail } from "@/lib/email.functions";
import { sendSmsTest } from "@/lib/sms.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/it/settings")({
  head: () => ({ meta: [{ title: "Email Settings — NOVAWORKS" }] }),
  component: ITSettings,
});

const NAV = [
  { to: "/dashboard/it", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/dashboard/it/system-health", label: "System Health", icon: LayoutDashboard, group: "System" },
  { to: "/dashboard/it/settings", label: "Email Settings", icon: Mail, group: "System" },
  { to: "/dashboard/it/property-of-the-day", label: "Property of the Day", icon: Star, group: "Content" },
];

function ITSettings() {
  const { roles } = useAuth();
  const navigate = useNavigate();
  const canEdit = roles.includes("it");
  const get = useServerFn(getAppSettings);
  const save = useServerFn(updateAppSettings);
  const sendTest = useServerFn(sendCustomEmail);
  const sendSmsSample = useServerFn(sendSmsTest);

  const [form, setForm] = useState({
    sender_name: "",
    from_email: "",
    reply_to: "",
    signature: "",
    brand_color: "#0d0d0d",
    site_url: "",
    sr_confirm_subject: "",
    sr_confirm_body: "",
    sr_urgent_label: "",
    sr_normal_label: "",
    sr_reply_subject: "",
    sms_enabled: false,
    sms_mode: "device" as "device" | "relay",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [smsTo, setSmsTo] = useState("");
  const [smsMessage, setSmsMessage] = useState("NOVAWORKS SMS test");
  const [sendingSms, setSendingSms] = useState(false);
  const [smsResult, setSmsResult] = useState<any>(null);

  useEffect(() => {
    if (roles.length && !canEdit) {
      toast.error("Only IT can edit email settings");
      navigate({ to: "/dashboard/it" });
    }
  }, [roles, canEdit, navigate]);

  useEffect(() => {
    get().then((s: any) => {
      if (s) setForm({
        sender_name: s.sender_name ?? "",
        from_email: s.from_email ?? "",
        reply_to: s.reply_to ?? "",
        signature: s.signature ?? "",
        brand_color: s.brand_color ?? "#0d0d0d",
        site_url: s.site_url ?? "",
        sr_confirm_subject: s.sr_confirm_subject ?? "",
        sr_confirm_body: s.sr_confirm_body ?? "",
        sr_urgent_label: s.sr_urgent_label ?? "",
        sr_normal_label: s.sr_normal_label ?? "",
        sr_reply_subject: s.sr_reply_subject ?? "",
        sms_enabled: Boolean(s.sms_enabled),
        sms_mode: s.sms_mode === "relay" ? "relay" : "device",
      });
    }).finally(() => setLoading(false));
  }, [get]);

  const submit = async () => {
    setSaving(true);
    try {
      await save({ data: { ...form, reply_to: form.reply_to || null } });
      toast.success("Email settings saved");
    } catch (e: any) { toast.error(e.message ?? "Failed to save"); }
    finally { setSaving(false); }
  };

  const sendTestEmail = async () => {
    if (!testTo) return toast.error("Enter a recipient");
    setSendingTest(true);
    try {
      await sendTest({ data: { to: testTo, subject: "Novaworks email test", html: "<p>This is a test email from your Novaworks settings.</p>", kind: "test" } });
      toast.success("Test email sent");
    } catch (e: any) { toast.error(e.message ?? "Failed to send"); }
    finally { setSendingTest(false); }
  };


  const runSmsTest = async () => {
    if (!smsTo.trim()) return toast.error("Enter a destination phone number");
    setSendingSms(true);
    setSmsResult(null);
    try {
      const result: any = await sendSmsSample({ data: { to: smsTo.trim(), message: smsMessage.trim() || "NOVAWORKS SMS test", mode: form.sms_mode } });
      setSmsResult(result);
      if (result?.ok) toast.success("Sample SMS sent"); else toast.error(result?.error || "SMS test failed");
    } catch (e: any) {
      setSmsResult({ ok: false, error: e?.message || "SMS test failed" });
      toast.error(e?.message || "SMS test failed");
    } finally { setSendingSms(false); }
  };

  return (
    <DashboardShell title="Email Settings" subtitle="Configure how outbound emails appear to recipients" role="it" nav={NAV} actions={[{ label: saving ? "Saving…" : "Save Settings", icon: Save, onClick: submit, variant: "primary" }]}>
      {loading ? <p className="text-noir/60">Loading…</p> : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Panel title="Sender" subtitle="What recipients see in their inbox">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Sender name"><input className="input-luxe" value={form.sender_name} onChange={(e) => setForm({...form, sender_name: e.target.value})} /></Field>
                <Field label="From email"><input className="input-luxe" value={form.from_email} onChange={(e) => setForm({...form, from_email: e.target.value})} placeholder="no-reply@yourdomain.com" /></Field>
                <Field label="Reply-to (optional)"><input className="input-luxe" value={form.reply_to} onChange={(e) => setForm({...form, reply_to: e.target.value})} /></Field>
                <Field label="Site URL"><input className="input-luxe" value={form.site_url} onChange={(e) => setForm({...form, site_url: e.target.value})} /></Field>
                <Field label="Brand color"><input type="color" className="input-luxe h-10" value={form.brand_color} onChange={(e) => setForm({...form, brand_color: e.target.value})} /></Field>
              </div>
            </Panel>
            <Panel title="Email footer / signature" subtitle="Shown at the bottom of every outgoing email">
              <textarea className="input-luxe min-h-40 font-mono text-sm" value={form.signature} onChange={(e) => setForm({...form, signature: e.target.value})} />
              <p className="text-xs text-noir/50 mt-2">Line breaks are preserved. This appears under every system email.</p>
            </Panel>
            <Panel title="SMS Hub" subtitle="Configure the active route and send a real sample SMS. API URL and API key remain protected in .env.">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="SMS notifications">
                  <select className="input-luxe" value={form.sms_enabled ? "on" : "off"} onChange={(e) => setForm({...form, sms_enabled: e.target.value === "on"})}>
                    <option value="on">Enabled</option><option value="off">Disabled</option>
                  </select>
                </Field>
                <Field label="Default SMS route">
                  <select className="input-luxe" value={form.sms_mode} onChange={(e) => setForm({...form, sms_mode: e.target.value as "device" | "relay"})}>
                    <option value="device">Device</option><option value="relay">Relay</option>
                  </select>
                </Field>
                <Field label="Sample destination">
                  <input className="input-luxe" value={smsTo} onChange={(e) => setSmsTo(e.target.value)} placeholder="+2507XXXXXXXX" />
                </Field>
                <Field label="Sample message">
                  <input className="input-luxe" value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} />
                </Field>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button type="button" onClick={runSmsTest} disabled={sendingSms} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-noir-deep text-white text-sm disabled:opacity-60">
                  <Send className="h-4 w-4" /> {sendingSms ? "Testing…" : "Send sample SMS"}
                </button>
                <span className="text-xs text-noir/45">Uses the selected {form.sms_mode} endpoint.</span>
              </div>
              {smsResult && <div className={`mt-4 rounded-xl border p-3 text-xs ${smsResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
                <div className="font-semibold mb-1">{smsResult.ok ? "SMS test succeeded" : "SMS test failed"}</div>
                {smsResult.error && <div>{smsResult.error}</div>}
                {smsResult.endpoint && <div className="mt-1 break-all">Endpoint: {smsResult.endpoint}</div>}
                {smsResult.providerStatus != null && <div>HTTP status: {smsResult.providerStatus}</div>}
                {smsResult.providerPayload && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-white/70 p-2">{JSON.stringify(smsResult.providerPayload, null, 2)}</pre>}
                {smsResult.payload && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-white/70 p-2">{JSON.stringify(smsResult.payload, null, 2)}</pre>}
              </div>}
              <p className="text-xs text-noir/50 mt-3">Required .env values: SMS_API_BASE_URL and SMS_API_KEY. Optional: SMS_DEVICE_PATH, SMS_RELAY_PATH and SMS_TIMEOUT_MS.</p>
            </Panel>
            <Panel title="Send a test email" subtitle="Verify your sender domain is configured in Resend">
              <div className="flex gap-2">
                <input className="input-luxe flex-1" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
                <button onClick={sendTestEmail} disabled={sendingTest} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-noir-deep text-white text-sm disabled:opacity-60">
                  <Send className="h-4 w-4" /> {sendingTest ? "Sending…" : "Send test"}
                </button>
              </div>
              <p className="text-xs text-noir/50 mt-3">⚠ The From email's domain must be verified in your Resend account, or Resend will reject the send.</p>
            </Panel>
            <Panel title="Service request templates" subtitle="Customize the confirmation email customers receive and urgency wording">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Confirmation subject"><input className="input-luxe" value={form.sr_confirm_subject} onChange={(e) => setForm({...form, sr_confirm_subject: e.target.value})} /></Field>
                <Field label="Reply subject"><input className="input-luxe" value={form.sr_reply_subject} onChange={(e) => setForm({...form, sr_reply_subject: e.target.value})} /></Field>
                <Field label="Urgent wording"><input className="input-luxe" value={form.sr_urgent_label} onChange={(e) => setForm({...form, sr_urgent_label: e.target.value})} /></Field>
                <Field label="Normal wording"><input className="input-luxe" value={form.sr_normal_label} onChange={(e) => setForm({...form, sr_normal_label: e.target.value})} /></Field>
              </div>
              <div className="mt-4">
                <Field label="Confirmation body">
                  <textarea className="input-luxe min-h-40 font-mono text-sm" value={form.sr_confirm_body} onChange={(e) => setForm({...form, sr_confirm_body: e.target.value})} />
                </Field>
                <p className="text-xs text-noir/50 mt-2">
                  Available placeholders: <code>{`{{name}}`}</code> <code>{`{{title}}`}</code> <code>{`{{priority}}`}</code> <code>{`{{urgency_label}}`}</code>
                </p>
              </div>
            </Panel>
          </div>
          <div className="space-y-6">
            <Panel title="Live preview" subtitle="How a recipient sees your email">
              <div className="rounded-md overflow-hidden border border-noir/10 text-sm">
                <div style={{ background: "#0d0d0d", color: "#fff", padding: "18px 20px", fontWeight: 700, borderBottom: "3px solid #e8ae4d", letterSpacing: ".08em" }}>{form.sender_name || "NOVAWORKS"}</div>
                <div className="p-5 bg-white">
                  <p>Hello,</p>
                  <p>This is an example body. Real emails populate dynamic content here.</p>
                </div>
                <div className="p-4 border-t bg-white text-xs text-noir/60 whitespace-pre-line">{form.signature}</div>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-xs font-medium text-noir/60 mb-1.5">{label}</div>{children}</label>;
}