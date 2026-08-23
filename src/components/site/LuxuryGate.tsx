import { Link } from "@tanstack/react-router";
import { Crown, ShieldCheck, Eye, FileText, Box, Phone, ArrowRight, Lock } from "lucide-react";

export function LuxuryGate({ slug }: { slug: string }) {
  return (
    <div className="fixed inset-0 z-[90] bg-noir-deep/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card text-foreground rounded-2xl max-w-md w-full p-8 shadow-2xl border border-gold/30 relative">
        <div className="w-14 h-14 rounded-full bg-gold/15 text-gold flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="mt-5 font-display text-2xl text-center">Exclusive Access Required</h2>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          This luxury property requires verification to view full details and pricing.
        </p>

        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Verified members get access to:</div>
          <ul className="space-y-3 text-sm">
            <Bullet icon={<Eye className="w-4 h-4" />}>Exclusive property details &amp; pricing</Bullet>
            <Bullet icon={<FileText className="w-4 h-4" />}>Detailed floor plans &amp; documentation</Bullet>
            <Bullet icon={<Box className="w-4 h-4" />}>Virtual 3D tours &amp; walkthrough videos</Bullet>
            <Bullet icon={<Phone className="w-4 h-4" />}>Priority contact with property managers</Bullet>
          </ul>
        </div>

        <div className="mt-7 grid gap-2">
          <Link
            to="/luxury-access"
            search={{ slug } as any}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-gold-soft to-gold text-noir-deep font-semibold py-3 rounded-md"
          >
            Request Access <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/verify-access"
            className="inline-flex items-center justify-center gap-2 border border-border py-3 rounded-md text-sm hover:border-gold/50"
          >
            <ShieldCheck className="w-4 h-4" /> Sign In (Already Verified)
          </Link>
          <Link to="/properties" className="text-center text-xs text-muted-foreground mt-1 hover:text-gold">
            ← Back to public listings
          </Link>
        </div>

        <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-gradient-to-r from-gold-soft to-gold text-noir-deep text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
          <Crown className="w-3 h-3" /> Luxury Property
        </div>
      </div>
    </div>
  );
}

function Bullet({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-7 h-7 rounded-md bg-gold/15 text-gold flex items-center justify-center shrink-0">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

/** Returns true if the visitor has a stored, locally-validated luxury access token. */
export function hasLuxuryAccess(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!localStorage.getItem("nw_luxury_token");
  } catch {
    return false;
  }
}