import { Check, X } from "lucide-react";

export function passwordChecks(password: string) {
  return {
    length: password.length >= 9,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function isStrongPassword(password: string) {
  return Object.values(passwordChecks(password)).every(Boolean);
}

export function PasswordStrength({ password }: { password: string }) {
  const checks = passwordChecks(password);
  const entries = [
    ["9+ characters", checks.length],
    ["Uppercase", checks.upper],
    ["Lowercase", checks.lower],
    ["Number", checks.number],
    ["Symbol", checks.symbol],
  ] as const;
  const passed = entries.filter(([, ok]) => ok).length;
  const strong = passed === entries.length;
  const width = `${Math.max(password ? 12 : 0, (passed / entries.length) * 100)}%`;

  return <div className="mt-2 space-y-2" aria-live="polite">
    <div className="h-1.5 rounded-full bg-noir/10 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-300 ${strong ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width }} />
    </div>
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {entries.map(([label, ok]) => <span key={label} className={`inline-flex items-center gap-1 text-[10px] transition ${ok ? "text-emerald-600" : "text-rose-500"}`}>
        {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}{label}
      </span>)}
    </div>
    <div className={`text-[11px] font-semibold transition ${strong ? "text-emerald-600" : password ? "text-rose-600" : "text-noir/45"}`}>
      {strong ? "Strong password — ready to use" : password ? "Password is not strong enough yet" : "Create a strong password"}
    </div>
  </div>;
}
