import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, User as UserIcon, ArrowRight, Phone, Home } from "lucide-react";
import { useAuth, dashboardPathFor } from "@/lib/use-auth";
import { VerifyOtpModal } from "@/components/auth/VerifyOtpModal";
import { useServerFn } from "@tanstack/react-start";
import { getHomeContent } from "@/lib/home-content.functions";
import { PasswordStrength, isStrongPassword } from "@/components/auth/PasswordStrength";
import { parseVideoUrl } from "@/components/dashboard/VideoUrlInput";

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [
      { title: "Sign in — NOVAWORKS" },
      { name: "description", content: "Sign in or create your NOVAWORKS account to access exclusive luxury listings." },
    ],
  }),
  component: AuthPage,
});

const DEFAULT_HERO_IMAGE = "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Enter your password").max(128),
});

const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(7, "Enter a valid phone").max(20).optional().or(z.literal("")),
  password: z.string().min(9, "At least 9 characters").max(128).regex(/[A-Z]/, "Include an uppercase letter").regex(/[a-z]/, "Include a lowercase letter").regex(/\d/, "Include a number").regex(/[^A-Za-z0-9]/, "Include a symbol"),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, primaryRole, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const loadHome = useServerFn(getHomeContent);
  const [heroImage, setHeroImage] = useState<string>(DEFAULT_HERO_IMAGE);
  const [heroVideo, setHeroVideo] = useState<string>("");
  useEffect(() => {
    loadHome().then((d) => {
      if (d?.auth_hero_image_url) setHeroImage(d.auth_hero_image_url);
      if (d?.auth_hero_video_url) setHeroVideo(d.auth_hero_video_url);
    }).catch(() => {});
  }, [loadHome]);

  // Sign-in fields
  const [siEmail, setSiEmail] = useState("");
  useEffect(() => {
    try {
      const luxuryEmail = localStorage.getItem("nw_luxury_email");
      if (luxuryEmail) setSiEmail(luxuryEmail);
    } catch {}
  }, []);
  const [siPassword, setSiPassword] = useState("");

  // Sign-up fields
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPhone, setSuPhone] = useState("");
  const [suPassword, setSuPassword] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      // Don't pre-compute destination here — roles may not be loaded yet,
      // which would default buyer. /auth/welcome waits for roles and routes correctly.
      navigate({ to: "/auth/welcome", search: {} });
    }
  }, [user, authLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    const parsed = signInSchema.safeParse({ email: siEmail, password: siPassword });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid input");
    setSubmitting(true);
    try {
      const r = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...parsed.data, remember}) });
      const data = await r.json();
      if (!r.ok) { if (data.error === "EMAIL_NOT_VERIFIED") { await fetch("/api/auth/otp", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:parsed.data.email})}); setVerifyEmail(parsed.data.email); return; } throw new Error(data.error || "Sign in failed"); }
      localStorage.setItem("novaworks_session", data.token);
      window.location.href = "/auth/welcome";
    } catch (err:any) { setError(err.message || "Sign in failed"); } finally { setSubmitting(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    const parsed = signUpSchema.safeParse({ full_name:suName,email:suEmail,phone:suPhone,password:suPassword });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid input");
    setSubmitting(true);
    try {
      const r=await fetch("/api/auth/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(parsed.data)}); const data=await r.json();
      if(!r.ok) throw new Error(data.error||"Could not create account");
      setVerifyEmail(parsed.data.email);
    } catch(err:any){setError(err.message||"Could not create account")} finally{setSubmitting(false)}
  };

  const handleGoogle = async () => {
    setError("Google sign-in is disabled in the MySQL self-hosted build. Use your NOVAWORKS email and password.");
  };

  return (
    <div className="min-h-screen bg-[#f5f3ee] px-4 py-5 sm:px-6 sm:py-8 lg:grid lg:place-items-center">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[28px] border border-noir/10 bg-white shadow-2xl lg:grid-cols-[1.08fr_.92fr] lg:min-h-[720px]">
      {/* Left: form */}
      <div className="flex flex-col px-6 sm:px-10 lg:px-14 py-8 lg:py-10">
        <Link to="/" className="inline-flex items-center gap-3 group w-fit">
          <div className="h-10 w-10 rounded-md bg-noir-deep text-gold flex items-center justify-center">
            <Home className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-xl tracking-wide text-noir-deep">NOVAWORKS</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-noir/50">Where Prime Property Meets Peace of Mind</div>
          </div>
        </Link>

        <div className="my-auto max-w-[390px] w-full mx-auto py-8">
          <h1 className="font-display text-3xl md:text-[2.1rem] leading-tight text-noir-deep">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-noir/60">
            {mode === "signin"
              ? "Sign in to access your account and manage your properties"
              : "Join NOVAWORKS to save listings, schedule visits, and list your own properties."}
          </p>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <Field label="Email address">
                <InputWithIcon icon={<Mail className="h-4 w-4" />}>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={siEmail}
                    onChange={(e) => setSiEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-transparent outline-none text-sm"
                  />
                </InputWithIcon>
              </Field>
              <Field
                label="Password"
                right={
                  <Link to="/auth/password-reset" className="text-xs font-medium text-gold hover:underline">Forgot password?</Link>
                }
              >
                <InputWithIcon icon={<Lock className="h-4 w-4" />}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={siPassword}
                    onChange={(e) => setSiPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-transparent outline-none text-sm"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-noir/50 hover:text-noir">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </InputWithIcon>
              </Field>
              <label className="flex items-center gap-2 text-sm text-noir/70">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-[color:var(--color-gold)]" />
                Remember me for 30 days
              </label>
              <button
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gold text-noir-deep font-semibold py-3 hover:bg-gold-soft transition disabled:opacity-60"
              >
                {submitting ? "Signing in…" : <>Sign in <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="mt-6 space-y-4">
              <Field label="Full name">
                <InputWithIcon icon={<UserIcon className="h-4 w-4" />}>
                  <input required value={suName} onChange={(e) => setSuName(e.target.value)} placeholder="Jean-Marie Uwimana" className="w-full bg-transparent outline-none text-sm" />
                </InputWithIcon>
              </Field>
              <Field label="Email address">
                <InputWithIcon icon={<Mail className="h-4 w-4" />}>
                  <input required type="email" autoComplete="email" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} placeholder="name@example.com" className="w-full bg-transparent outline-none text-sm" />
                </InputWithIcon>
              </Field>
              <Field label="Phone (optional)">
                <InputWithIcon icon={<Phone className="h-4 w-4" />}>
                  <input value={suPhone} onChange={(e) => setSuPhone(e.target.value)} placeholder="+250 7XX XXX XXX" className="w-full bg-transparent outline-none text-sm" />
                </InputWithIcon>
              </Field>
              <Field label="Password">
                <InputWithIcon icon={<Lock className="h-4 w-4" />} tone={suPassword ? (isStrongPassword(suPassword) ? "success" : "danger") : "normal"}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={suPassword}
                    onChange={(e) => setSuPassword(e.target.value)}
                    placeholder="9+ characters with upper, lower, number and symbol"
                    className="w-full bg-transparent outline-none text-sm"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-noir/50 hover:text-noir">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </InputWithIcon>
                <PasswordStrength password={suPassword} />
              </Field>
              <button
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gold text-noir-deep font-semibold py-3 hover:bg-gold-soft transition disabled:opacity-60"
              >
                {submitting ? "Creating account…" : <>Create account <ArrowRight className="h-4 w-4" /></>}
              </button>
              <p className="text-xs text-noir/50">
                By creating an account you agree to our terms and privacy policy. We'll email you a 6-digit code to verify your address.
              </p>
            </form>
          )}

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-noir/10" />
            <span className="text-xs uppercase tracking-wider text-noir/40">Or continue with</span>
            <div className="h-px flex-1 bg-noir/10" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleGoogle} className="inline-flex items-center justify-center gap-2 rounded-md border border-noir/15 bg-white px-4 py-2.5 text-sm font-medium text-noir-deep hover:bg-noir/5">
              <GoogleIcon /> Google
            </button>
            <button disabled className="inline-flex items-center justify-center gap-2 rounded-md border border-noir/15 bg-white px-4 py-2.5 text-sm font-medium text-noir/40">
               Apple
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-noir/60">
            {mode === "signin" ? (
              <>Don't have an account?{" "}
                <button type="button" onClick={() => { setError(null); setMode("signup"); }} className="text-gold font-medium hover:underline">
                  Create account
                </button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button type="button" onClick={() => { setError(null); setMode("signin"); }} className="text-gold font-medium hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Right: hero */}
      <div className="relative hidden lg:block min-h-[720px] overflow-hidden bg-noir-deep">
        <AuthHeroMedia video={heroVideo} image={heroImage} />
        <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-gold/10 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute bottom-20 right-10 h-48 w-48 rounded-full border border-gold/20" />
        <div className="absolute inset-0 bg-black/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-noir-deep/80 via-noir-deep/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-9 text-white">
          <blockquote className="font-display text-xl italic leading-snug max-w-sm">
            "NOVAWORKS made finding our dream home effortless. Their attention to detail and personalized service exceeded all our expectations."
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gold/30 text-white flex items-center justify-center text-xs font-semibold">NW</div>
            <div>
              <div className="font-semibold">NOVAWORKS</div>
              <div className="text-xs text-white/70">Kigali, Rwanda</div>
            </div>
          </div>
        </div>
      </div>
      </div>
      {verifyEmail && (
        <VerifyOtpModal
          email={verifyEmail}
          onClose={() => setVerifyEmail(null)}
          onSuccess={() => {
            setVerifyEmail(null);
            navigate({ to: "/auth/welcome", search: { to: "" } });
          }}
        />
      )}
    </div>
  );
}

function AuthHeroMedia({ video, image }: { video: string; image: string }) {
  const parsed = parseVideoUrl(video || "");
  if (parsed.kind === "mp4" || parsed.kind === "webm") return <video src={parsed.embed || video} autoPlay muted loop playsInline preload="auto" poster={image || undefined} className="absolute inset-0 h-full w-full object-cover auth-media-kenburns" />;
  if ((parsed.kind === "youtube" || parsed.kind === "vimeo") && parsed.embed) {
    let src = parsed.embed;
    if (parsed.kind === "youtube") src += `${src.includes("?") ? "&" : "?"}autoplay=1&mute=1&controls=0&loop=1&playlist=${parsed.id || ""}&playsinline=1`;
    else src += `${src.includes("?") ? "&" : "?"}autoplay=1&muted=1&background=1&loop=1`;
    return <iframe src={src} title="NOVAWORKS sign-in background" className="absolute -inset-[8%] h-[116%] w-[116%] pointer-events-none auth-media-kenburns" allow="autoplay; fullscreen; encrypted-media" />;
  }
  return <img
    src={image || DEFAULT_HERO_IMAGE}
    alt="Luxury property"
    loading="eager"
    decoding="async"
    fetchPriority="high"
    onError={(e) => {
      const el = e.currentTarget;
      if (el.src !== DEFAULT_HERO_IMAGE) el.src = DEFAULT_HERO_IMAGE;
    }}
    className="absolute inset-0 h-full w-full object-cover auth-media-kenburns"
  />;
}

function Field({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-noir-deep">{label}</span>
        {right}
      </div>
      {children}
    </label>
  );
}

function InputWithIcon({ icon, children, tone = "normal" }: { icon: React.ReactNode; children: React.ReactNode; tone?: "normal" | "danger" | "success" }) {
  const border = tone === "danger" ? "border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-200" : tone === "success" ? "border-emerald-400 focus-within:border-emerald-500 focus-within:ring-emerald-200" : "border-noir/15 focus-within:border-gold focus-within:ring-gold/20";
  return (
    <div className={`flex items-center gap-2 rounded-md border bg-white px-3 py-2.5 focus-within:ring-2 transition ${border}`}>
      <span className="text-noir/40">{icon}</span>
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.25-1.7 3.66-5.5 3.66-3.31 0-6.02-2.74-6.02-6.12s2.71-6.12 6.02-6.12c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.86 2.94 14.66 2 12 2 6.86 2 2.7 6.16 2.7 11.3S6.86 20.6 12 20.6c6.93 0 11.5-4.87 11.5-11.72 0-.79-.09-1.39-.2-1.98H12z"/>
    </svg>
  );
}