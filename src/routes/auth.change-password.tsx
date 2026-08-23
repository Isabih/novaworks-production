import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LockKeyhole, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { PasswordStrength, isStrongPassword } from "@/components/auth/PasswordStrength";

export const Route = createFileRoute("/auth/change-password")({ head: () => ({ meta: [{ title: "Create new password — NOVAWORKS" }] }), component: Page });

function Page() {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const strong = isStrongPassword(p1);
  const match = !!p2 && p1 === p2;

  const submit = async () => {
    if (!strong) return toast.error("Create a strong password first");
    if (!match) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      const token = localStorage.getItem("novaworks_session");
      const r = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ new_password: p1 }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      toast.success("Password changed successfully");
      window.location.href = "/auth/welcome";
    } catch (e: any) { toast.error(e.message || "Could not change password"); }
    finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-[#f7f6f2] grid place-items-center px-4 py-10">
    <section className="bg-white border border-noir/10 shadow-xl rounded-3xl p-8 max-w-lg w-full">
      <div className="h-12 w-12 rounded-xl bg-gold/15 grid place-items-center"><LockKeyhole className="h-6 w-6" /></div>
      <h1 className="font-display text-3xl mt-5">Create a new password</h1>
      <p className="text-sm text-noir/55 mt-2">Your new password must satisfy every security requirement below.</p>
      <div className="mt-6">
        <div className="relative">
          <input type={show ? "text" : "password"} className={`input-luxe pr-11 transition ${p1 ? (strong ? "!border-emerald-400" : "!border-rose-400") : ""}`} placeholder="New password" value={p1} onChange={e => setP1(e.target.value)} />
          <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-noir/40">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </div>
        <PasswordStrength password={p1} />
      </div>
      <div className="mt-4">
        <input type={show ? "text" : "password"} className={`input-luxe transition ${p2 ? (match ? "!border-emerald-400" : "!border-rose-400") : ""}`} placeholder="Confirm password" value={p2} onChange={e => setP2(e.target.value)} />
        {p2 && <div className={`mt-1.5 text-[11px] font-semibold ${match ? "text-emerald-600" : "text-rose-600"}`}>{match ? "✓ Passwords match" : "Passwords do not match"}</div>}
      </div>
      <button onClick={submit} disabled={busy || !strong || !match} className="w-full mt-6 rounded-xl bg-noir-deep text-white py-3 font-semibold disabled:opacity-40">{busy ? "Saving…" : "Save new password"}</button>
    </section>
  </main>;
}
