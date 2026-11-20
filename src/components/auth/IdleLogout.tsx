import { useEffect, useState } from "react";
import { useAuth } from "@/lib/use-auth";

const IDLE_MS = 5 * 60 * 1000;
export function IdleLogout() {
  const { user, signOut } = useAuth();
  const [remaining, setRemaining] = useState(300);
  useEffect(() => {
    if (!user) return;
    let lastActivity = Date.now();
    let loggingOut = false;
    const activity = () => { lastActivity = Date.now(); setRemaining(300); };
    const events = ["pointerdown", "keydown", "touchstart", "wheel"] as const;
    for (const event of events) window.addEventListener(event, activity, { passive: true });
    const interval = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((IDLE_MS - (Date.now() - lastActivity)) / 1000));
      setRemaining(left);
      if (left === 0 && !loggingOut) {
        loggingOut = true;
        void signOut();
      }
    }, 250);
    return () => { window.clearInterval(interval); for (const event of events) window.removeEventListener(event, activity); };
  }, [user?.id, signOut]);
  if (!user || remaining > 10 || remaining === 0) return null;
  return <div role="status" aria-live="polite" className="fixed right-4 top-4 z-[200] rounded-xl border border-white/20 bg-[#0b1523]/75 px-4 py-3 text-white shadow-xl backdrop-blur-lg">
    <div className="text-xs font-medium">Signing out due to inactivity</div>
    <div className="mt-1 text-right text-lg font-semibold tabular-nums">{remaining}s</div>
  </div>;
}
