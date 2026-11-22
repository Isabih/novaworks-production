import { Check, X } from "lucide-react";

export function passwordChecks(password: string, fullName = "", email = "") {
  const tokens = [fullName, email.split("@")[0]].flatMap(v => v.toLowerCase().split(/[^a-z0-9]+/)).filter(v => v.length >= 3);
  const lower = password.toLowerCase();
  return {
    length: password.length >= 12,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    personal: !tokens.some(token => lower.includes(token)),
    sequence: !/(?:012|123|234|345|456|567|678|789|890|987|876|765|654|543|432|321|210)/.test(password),
  };
}
export function isStrongPassword(password: string, fullName = "", email = "") {
  return Object.values(passwordChecks(password, fullName, email)).every(Boolean);
}
export function PasswordStrength({ password, fullName = "", email = "" }: { password: string; fullName?: string; email?: string }) {
  const checks = passwordChecks(password, fullName, email);
  const entries = [
    ["12+ characters", checks.length], ["Uppercase", checks.upper], ["Lowercase", checks.lower],
    ["Number", checks.number], ["Symbol", checks.symbol],
    ["Avoid your name/email", checks.personal], ["No number sequences (123)", checks.sequence],
  ] as const;
  const passed = entries.filter(([, ok]) => ok).length;
  const strong = passed === entries.length;
  return <div className="mt-3 space-y-3" aria-live="polite">
    <div className="h-2 rounded-full bg-white/20 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${strong ? "bg-emerald-500" : passed >= 5 ? "bg-amber-400" : "bg-rose-500"}`} style={{ width: `${password ? Math.max(8, passed / entries.length * 100) : 0}%` }}/>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {entries.map(([label, ok]) => <span key={label} className={`inline-flex items-center gap-1 text-[11px] transition-colors ${ok ? "text-emerald-400" : "text-amber-200/80"}`}>
        {ok ? <Check className="h-3 w-3"/> : <X className="h-3 w-3"/>}{label}
      </span>)}
    </div>
    <p className={`text-xs font-medium transition-colors ${strong ? "text-emerald-400" : "text-white/70"}`}>
      {strong ? "Excellent! Your password meets the security requirements." : "Every improvement makes your account safer. Keep going!"}
    </p>
  </div>;
}
