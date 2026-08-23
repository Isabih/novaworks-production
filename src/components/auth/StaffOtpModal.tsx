import { useEffect, useRef, useState } from "react";
import { Mail, ArrowRight, RefreshCw, X } from "lucide-react";

/** OTP modal used during staff invitation. The actual verification is done by
 * the caller's onSubmit (which calls a server function). */
export function StaffOtpModal({
  email,
  onSubmit,
  onResend,
  onClose,
}: {
  email: string;
  onSubmit: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onClose?: () => void;
}) {
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Match the 5-minute server-side expiry so the user sees the same window.
  const [cooldown, setCooldown] = useState(60);
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setCooldown((s) => (s > 0 ? s - 1 : 0));
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const updateDigit = (i: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    setCode((prev) => { const n = [...prev]; n[i] = digit; return n; });
    if (digit && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    setCode(Array(6).fill("").map((_, i) => text[i] ?? ""));
    inputs.current[Math.min(text.length, 5)]?.focus();
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    const token = code.join("");
    if (token.length !== 6) return setError("Enter all 6 digits");
    setSubmitting(true);
    try {
      await onSubmit(token);
    } catch (err: any) {
      setError(err?.message ?? "Verification failed");
      setCode(Array(6).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    setError(null);
    setInfo(null);
    try {
      await onResend();
      setCooldown(60);
      setSecondsLeft(5 * 60);
      setInfo("A new code was sent.");
    } catch (err: any) {
      setError(err?.message ?? "Failed to resend");
    }
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(1, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-noir-deep/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-noir/10 bg-white p-8 shadow-2xl">
        {onClose && (
          <button onClick={onClose} className="absolute top-3 right-3 text-noir/40 hover:text-noir" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        )}
        <div className="mx-auto h-14 w-14 rounded-full bg-gold/15 text-gold flex items-center justify-center">
          <Mail className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-center font-display text-2xl text-noir-deep">Verify before registering</h2>
        <p className="mt-2 text-center text-sm text-noir/60">
          We sent a 6-digit code to <span className="font-medium text-noir-deep">{email}</span>.
          The account will only be created once the code is confirmed.
        </p>
        <p className="mt-1 text-center text-xs text-noir/50">
          Code expires in <span className="font-mono text-noir-deep">{mm}:{ss}</span>
        </p>

        {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {info && !error && <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</div>}

        <form onSubmit={submit} className="mt-6 space-y-5">
          <div className="flex justify-between gap-2" onPaste={handlePaste}>
            {code.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => updateDigit(i, e.target.value)}
                onKeyDown={(e) => { if (e.key === "Backspace" && !code[i] && i > 0) inputs.current[i - 1]?.focus(); }}
                className="h-14 w-12 rounded-md border border-noir/20 bg-white text-center text-2xl font-semibold text-noir-deep outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
              />
            ))}
          </div>

          <button disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gold py-3 font-semibold text-noir-deep hover:bg-gold-soft transition disabled:opacity-60">
            {submitting ? "Verifying…" : <>Confirm registration <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-noir/60">
          Didn't receive it?{" "}
          <button type="button" disabled={cooldown > 0} onClick={resend} className="inline-flex items-center gap-1 font-medium text-gold disabled:text-noir/30">
            <RefreshCw className="h-3 w-3" /> {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        </div>
      </div>
    </div>
  );
}