import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { requestLuxuryAccess, verifyLuxuryOtp } from "@/lib/luxury.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_site/luxury-access")({
  head: () => ({ meta: [
    { title: "Request Luxury Access — NOVAWORKS" },
    { name: "description", content: "Verify your identity to browse our luxury portfolio." },
  ] }),
  component: LuxuryAccess,
});

function LuxuryAccess() {
  const slug = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("slug") || undefined : undefined;
  const req = useServerFn(requestLuxuryAccess);
  const ver = useServerFn(verifyLuxuryOtp);

  const [step, setStep] = useState<"form" | "otp" | "done">("form");
  const [reqId, setReqId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", reason: "" });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await req({ data: { ...form, property_slug: slug } });
      setReqId(r.id);
      setStep("otp");
      toast.success("Verification code sent to your email");
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    if (!reqId || code.length !== 6) return toast.error("Enter the 6-digit code");
    setBusy(true);
    try {
      await ver({ data: { id: reqId, code } });
      setStep("done");
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl">Luxury access</h1>
      <p className="text-noir/60 mt-2">Our luxury portfolio is shared by approval only. Verify your email to submit a request — our team will review and respond by email.</p>

      {step === "form" && (
        <div className="mt-8 space-y-3">
          <input className="input-luxe" placeholder="Full name" value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} />
          <input className="input-luxe" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
          <input className="input-luxe" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
          <textarea className="input-luxe min-h-28" placeholder="Reason for accessing luxury listings (optional)" value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} />
          <button onClick={submit} disabled={busy} className="px-5 py-2.5 rounded-md bg-noir-deep text-white text-sm disabled:opacity-60">{busy ? "Sending…" : "Send verification code"}</button>
        </div>
      )}

      {step === "otp" && (
        <div className="mt-8 space-y-3">
          <p className="text-sm">Enter the 6-digit code we just emailed to <strong>{form.email}</strong>.</p>
          <input className="input-luxe text-center text-2xl tracking-[10px] font-mono" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" />
          <button onClick={verify} disabled={busy} className="px-5 py-2.5 rounded-md bg-noir-deep text-white text-sm disabled:opacity-60">{busy ? "Verifying…" : "Verify"}</button>
        </div>
      )}

      {step === "done" && (
        <div className="mt-8 rounded-lg bg-emerald-50 border border-emerald-200 p-6">
          <h2 className="font-display text-2xl">Verified ✓</h2>
          <p className="mt-2 text-sm">Thank you. Your request is now with our team. When approved you'll receive an access link by email to unlock luxury listings.</p>
        </div>
      )}
    </div>
  );
}