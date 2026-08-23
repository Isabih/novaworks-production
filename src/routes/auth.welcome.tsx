import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Check, Sparkles } from "lucide-react";
import { useAuth, dashboardPathFor } from "@/lib/use-auth";

export const Route = createFileRoute("/auth/welcome")({
  validateSearch: (s) => z.object({ to: z.string().optional() }).parse(s),
  head: () => ({ meta: [{ title: "Welcome — NOVAWORKS" }] }),
  component: WelcomeAnimation,
});

function canOpenRequestedPath(path: string, roles: string[]) {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (path.startsWith("/dashboard/buyer")) return roles.includes("customer") || roles.includes("admin");
  if (path.startsWith("/dashboard/it")) return roles.includes("it") || roles.includes("admin");
  if (path.startsWith("/dashboard/admin")) return roles.includes("admin");
  if (path.startsWith("/dashboard/receptionist")) return roles.includes("receptionist") || roles.includes("it") || roles.includes("admin");
  if (path.startsWith("/dashboard/agent")) return roles.includes("agent") || roles.includes("it") || roles.includes("admin");
  if (path.startsWith("/dashboard/owner")) return roles.includes("owner") || roles.includes("it") || roles.includes("admin");
  return true;
}

function WelcomeAnimation() {
  const navigate = useNavigate();
  const { to } = Route.useSearch();
  const { user, profile, primaryRole, roles, loading, rolesLoaded } = useAuth();
  const [progress, setProgress] = useState(0);

  // animate progress 0 → 100 over ~2.4s
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / 2400) * 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, []);

  // After progress complete + auth ready, redirect
  useEffect(() => {
    if (progress < 100 || loading || !rolesLoaded) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (roles.length === 0) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    if (user.must_change_password) {
      navigate({ to: "/auth/change-password", replace: true });
      return;
    }
    let requested = to || "";
    if (!requested) { try { requested = localStorage.getItem("nw_post_auth_redirect") || ""; localStorage.removeItem("nw_post_auth_redirect"); } catch {} }
    const dest = requested && canOpenRequestedPath(requested, roles) ? requested : dashboardPathFor(primaryRole);
    navigate({ to: dest as any });
  }, [progress, loading, rolesLoaded, user, roles, primaryRole, to, navigate]);

  const firstName = (profile?.full_name ?? user?.email ?? "").split(" ")[0] || "back";

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white overflow-hidden">
      {/* Sparkle ring */}
      <div className="relative">
        <div className="absolute -inset-8 animate-spin-slow">
          <Sparkles className="absolute -top-2 left-1/2 -translate-x-1/2 h-5 w-5 text-gold" />
          <Sparkles className="absolute top-1/2 -right-2 -translate-y-1/2 h-4 w-4 text-gold/70" />
          <Sparkles className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-4 w-4 text-gold/80" />
          <Sparkles className="absolute top-1/2 -left-2 -translate-y-1/2 h-5 w-5 text-gold/60" />
        </div>
        <div className="relative h-32 w-32 rounded-full bg-gradient-to-br from-[#3a2912] to-[#1a1208] flex items-center justify-center shadow-[0_0_60px_rgba(212,165,116,0.3)]">
          <div className="h-20 w-20 rounded-full bg-black/30 flex items-center justify-center">
            <Check className="h-10 w-10 text-gold animate-check-pop" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      <h1 className="mt-10 font-display text-3xl md:text-4xl">
        {profile?.full_name ? `Welcome, ${firstName}!` : "Welcome Back!"}
      </h1>
      <p className="mt-2 text-sm text-white/60">Redirecting you to your dashboard…</p>

      <div className="mt-8 h-1 w-56 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-gold-soft to-gold transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}