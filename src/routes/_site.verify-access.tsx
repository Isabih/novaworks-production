import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ShieldCheck, MailCheck, Crown, Check, ArrowRight, Lock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { verifyLuxuryToken } from "@/lib/luxury.functions";

const searchSchema = z.object({ slug: z.string().optional(), token: z.string().optional() });

export const Route = createFileRoute("/_site/verify-access")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Request Luxury Access — NOVAWORKS" },
      { name: "description", content: "Verify your email to unlock exclusive NOVAWORKS luxury listings, private tours and pricing." },
      { property: "og:title", content: "Request Luxury Access — NOVAWORKS" },
      { property: "og:description", content: "Email-verified, admin-approved access to private luxury inventory." },
    ],
  }),
  component: VerifyAccess,
});

const BENEFITS = [
  "Full luxury inventory & pricing",
  "Private 3D tours and walkthrough videos",
  "Detailed floor plans and documentation",
  "Priority concierge with senior consultants",
  "Early access to off-market listings",
];

function VerifyAccess() {
  const { slug, token } = Route.useSearch();
  const [step, setStep] = useState<"form" | "sent">("form");
  const [email, setEmail] = useState("");
  const [tokenState, setTokenState] = useState<"none" | "checking" | "valid" | "invalid">(token ? "checking" : "none");
  const checkToken = useServerFn(verifyLuxuryToken);

  useEffect(() => {
    if (!token) return;
    checkToken({ data: { token } }).then((r: any) => {
      if (r.valid) {
        try {
          localStorage.setItem("nw_luxury_token", token);
          if (r.request?.email) localStorage.setItem("nw_luxury_email", r.request.email);
        } catch {}
        if (r.request?.email) setEmail(r.request.email);
        setTokenState("valid");
      } else {
        setTokenState("invalid");
      }
    }).catch(() => setTokenState("invalid"));
  }, [token]);

  if (token) {
    return (
      <div className="bg-noir-deep min-h-[calc(100vh-80px)] py-20 flex items-center">
        <div className="container-luxe max-w-xl mx-auto bg-white rounded-2xl p-10 text-center">
          {tokenState === "checking" && <p>Verifying your access link…</p>}
          {tokenState === "valid" && (<>
            <div className="w-14 h-14 rounded-full bg-gold/15 text-gold flex items-center justify-center mx-auto"><Crown className="w-7 h-7" /></div>
            <h2 className="mt-4 font-display text-2xl">Luxury access unlocked</h2>
            <p className="mt-2 text-sm text-noir/60">You can now browse the full luxury collection. Sign in with the approved email to request a VIP booking.</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link to="/properties" className="inline-flex items-center gap-2 text-sm text-gold font-medium">Browse listings <ArrowRight className="w-4 h-4" /></Link>
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-lg bg-noir-deep px-4 py-2 text-sm font-medium text-white">Sign in to book</Link>
            </div>
          </>)}
          {tokenState === "invalid" && (<>
            <h2 className="font-display text-2xl">This link is no longer valid</h2>
            <p className="mt-2 text-sm text-noir/60">It may have expired or been revoked. Request access again below.</p>
            <Link to="/luxury-access" className="mt-6 inline-block text-gold font-medium">Request access →</Link>
          </>)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-noir-deep min-h-[calc(100vh-80px)] py-20">
      <div className="container-luxe grid lg:grid-cols-[1.1fr_1fr] gap-12 items-start">
        <div className="text-white">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold">
            <Crown className="w-4 h-4" /> Private Access
          </div>
          <h1 className="mt-4 font-display text-4xl md:text-5xl leading-tight">
            Unlock the NOVAWORKS<br />Luxury Collection
          </h1>
          <p className="mt-4 text-white/70 max-w-lg">
            Our most exclusive residences are shown by invitation. Verify your email and our team
            will review your request — typically within one business day.
          </p>
          <ul className="mt-8 space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3 text-white/80">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-gold/15 text-gold flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </span>
                {b}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex items-center gap-3 text-xs text-white/50">
            <Lock className="w-4 h-4 text-gold" />
            Your information is reviewed manually — never shared, never sold.
          </div>
        </div>

        <div className="bg-white text-noir-deep rounded-2xl p-8 shadow-2xl border border-gold/20">
          {step === "form" ? (
            <form
              onSubmit={(e) => { e.preventDefault(); setStep("sent"); }}
              className="space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-gold/15 text-gold flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="font-display text-2xl">Request Verification</h2>
              <p className="text-sm text-noir/60">
                We'll send a confirmation link, then an advisor reviews and approves your access.
              </p>
              {slug && (
                <div className="text-xs text-noir/60 bg-noir/5 rounded-md px-3 py-2">
                  Requested listing: <span className="font-medium text-noir">{slug}</span>
                </div>
              )}
              <Field label="Full Name"><input required className="input-luxe" placeholder="Your name" /></Field>
              <Field label="Email Address">
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-luxe" placeholder="you@email.com" />
              </Field>
              <Field label="Phone Number"><input required className="input-luxe" placeholder="+250 7XX XXX XXX" /></Field>
              <Field label="Country of Residence"><input required className="input-luxe" placeholder="Rwanda" /></Field>
              <Field label="Buying Intent">
                <select required className="input-luxe">
                  <option value="">Select…</option>
                  <option>Primary residence</option>
                  <option>Investment</option>
                  <option>Vacation home</option>
                  <option>Corporate / Diplomatic</option>
                </select>
              </Field>
              <Field label="Budget Range (USD)">
                <select required className="input-luxe">
                  <option value="">Select…</option>
                  <option>$250K – $500K</option>
                  <option>$500K – $1M</option>
                  <option>$1M – $3M</option>
                  <option>$3M+</option>
                </select>
              </Field>
              <label className="flex items-start gap-2 text-xs text-noir/70">
                <input type="checkbox" required className="mt-0.5" />
                I agree to NOVAWORKS' privacy terms and authorize verification of my information.
              </label>
              <button className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-gold-soft to-gold text-noir-deep font-semibold py-3 rounded-md">
                Send Verification Email <ArrowRight className="w-4 h-4" />
              </button>
              <div className="text-center text-xs text-noir/60">
                Already verified? <Link to="/" className="text-gold font-medium">Sign in</Link>
              </div>
            </form>
          ) : (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-gold/15 text-gold flex items-center justify-center mx-auto">
                <MailCheck className="w-7 h-7" />
              </div>
              <h2 className="mt-4 font-display text-2xl">Check your inbox</h2>
              <p className="mt-2 text-sm text-noir/60">
                We've sent a verification link to<br /><span className="font-medium text-noir">{email || "your email"}</span>.
                Once confirmed, an advisor will review your request within 24 hours.
              </p>
              <Link to="/properties" className="mt-6 inline-flex items-center gap-2 text-sm text-gold font-medium">
                Browse public listings <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-noir/60 mb-1">{label}</span>
      {children}
    </label>
  );
}