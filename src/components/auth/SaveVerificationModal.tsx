import { useEffect, useRef, useState } from "react";
import { ArrowRight, Mail, RefreshCw, X } from "lucide-react";

type Props = {
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onClose: () => void;
  title?: string;
};

export function SaveVerificationModal({ onVerify, onResend, onClose, title = "Verify your changes" }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(45);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  useEffect(() => { inputs.current[0]?.focus(); }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(n => n - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (!/^\\d{6}$/.test(code)) { setError("Enter all six digits."); return; }
    setBusy(true); setError(""); setInfo("");
    try { await onVerify(code); }
    catch (e: any) { setError(e?.message || "Verification failed. Please try again."); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    setBusy(true); setError(""); setInfo("");
    try {
      await onResend();
      setDigits(Array(6).fill("")); setCooldown(45);
      setInfo("A new verification code was sent to your account email.");
      inputs.current[0]?.focus();
    } catch (e: any) { setError(e?.message || "Unable to resend the code."); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-noir-deep/70 p-4 backdrop-blur-sm" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="save-otp-title" className="relative w-full max-w-md rounded-2xl border border-noir/10 bg-white p-6 sm:p-8 shadow-2xl">
        <button type="button" onClick={onClose} disabled={busy} aria-label="Cancel verification" className="absolute right-4 top-4 text-noir/40 hover:text-noir disabled:opacity-40"><X className="h-5 w-5" /></button>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold"><Mail className="h-7 w-7" /></div>
        <h2 id="save-otp-title" className="mt-5 text-center font-display text-2xl">{title}</h2>
        <p className="mt-2 text-center text-sm text-noir/60">Enter the six-digit code sent to your account email to approve these exact changes. The code expires in 5 minutes.</p>
        {error && <div role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {info && <div role="status" className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{info}</div>}
        <form onSubmit={submit} className="mt-6 space-y-5">
          <div className="flex justify-between gap-2" aria-label="Six-digit verification code">
            {digits.map((digit, i) => <input key={i} ref={el => { inputs.current[i] = el; }} aria-label={`Digit ${i + 1}`} autoComplete={i === 0 ? "one-time-code" : "off"} inputMode="numeric" pattern="[0-9]*" maxLength={1} disabled={busy} value={digit}
              onChange={e => { const v = e.target.value.replace(/\\D/g, "").slice(-1); setDigits(d => d.map((x, j) => j === i ? v : x)); if (v && i < 5) inputs.current[i + 1]?.focus(); }}
              onKeyDown={e => { if (e.key === "Backspace" && !digit && i > 0) inputs.current[i - 1]?.focus(); }}
              onPaste={e => { const v = e.clipboardData.getData("text").replace(/\\D/g, "").slice(0, 6); if (v.length > 1) { e.preventDefault(); setDigits(Array.from({ length: 6 }, (_, j) => v[j] || "")); inputs.current[Math.min(v.length, 5)]?.focus(); } }}
              className="h-12 w-10 min-w-0 rounded-md border border-noir/20 text-center text-xl font-semibold outline-none focus:border-gold sm:h-14 sm:w-12" />)}
          </div>
          <button type="submit" disabled={busy || digits.join("").length !== 6} className="flex w-full items-center justify-center gap-2 rounded-md bg-gold py-3 font-semibold text-noir-deep disabled:opacity-50">{busy ? "Verifying…" : <>Verify & save changes <ArrowRight className="h-4 w-4" /></>}</button>
        </form>
        <div className="mt-5 text-center text-sm text-noir/60">Didn't receive it? <button type="button" disabled={busy || cooldown > 0} onClick={resend} className="inline-flex items-center gap-1 font-medium text-noir-deep disabled:text-noir/30"><RefreshCw className="h-3 w-3" />{cooldown ? `Resend in ${cooldown}s` : "Resend code"}</button></div>
        <button type="button" disabled={busy} onClick={onClose} className="mt-4 w-full text-center text-sm text-noir/60 hover:text-noir disabled:opacity-40">Cancel without saving</button>
      </div>
    </div>
  );
}
