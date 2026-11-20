import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, User as UserIcon, ArrowRight, Phone, Home } from "lucide-react";
import { useAuth, dashboardPathFor } from "@/lib/use-auth";
import { VerifyOtpModal } from "@/components/auth/VerifyOtpModal";
import { cfImage } from "@/lib/cf-image";
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
  const [heroImage, setHeroImage] = useState<string>("");
  const [heroReady, setHeroReady] = useState(false);
  const [heroMediaLoaded, setHeroMediaLoaded] = useState(false);
  const [heroVideo, setHeroVideo] = useState<string>("");
  useEffect(() => {
    let active = true;
    const cacheKey = "nw_public_home_media_v1";
    const apply = (home: any) => {
      if (!active) return;
      setHeroImage(typeof home?.auth_hero_image_url === "string" ? home.auth_hero_image_url : "");
      setHeroVideo(typeof home?.auth_hero_video_url === "string" ? home.auth_hero_video_url : "");
      setHeroReady(true);
    };
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const entry = JSON.parse(cached);
        if (Date.now() - entry.time < 60_000) apply(entry.home);
      }
    } catch {}
    // Use the same public bundle as the homepage, avoiding an extra server-function request.
    fetch("/api/public/property-categories?bundle=home")
      .then(r => { if (!r.ok) throw new Error("Homepage media unavailable"); return r.json(); })
      .then(data => {
        if (!active) return;
        const home = data?.home ?? {};
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), home })); } catch {}
        apply(home);
      })
      .catch(() => { if (active) setHeroReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => { setHeroMediaLoaded(false); }, [heroImage, heroVideo]);

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

  const formCard = (
    <div className="glass-dark w-full max-w-md rounded-3xl border border-white/30 bg-[#0b1523]/60 backdrop-blur-2xl p-7 sm:p-9 text-white ring-1 ring-white/15 shadow-[0_36px_110px_-25px_rgba(0,0,0,.95)]">
      <span className="mb-4 inline-flex rounded-full border border-gold/50 bg-black/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.15em] text-gold">NOVAWORKS · Version 1.2.3 Enhanced</span><h1 className="font-display text-3xl">{mode==="signin"?"Welcome back":"Create your account"}</h1>
      <p className="mt-2 text-sm text-white/65">{mode==="signin"?"Sign in to manage your properties, bookings and saved listings.":"Join NOVAWORKS to save listings, schedule visits, and manage your property journey."}</p>
      {error&&<div role="alert" className="mt-5 rounded-xl border border-rose-400/40 bg-rose-500/15 p-3 text-sm text-rose-100">{error}</div>}
      {mode==="signin"?<form onSubmit={handleSignIn} className="mt-7 space-y-4">
        <Field label="Email address"><InputWithIcon icon={<Mail className="h-4 w-4"/>}><input type="email" required autoComplete="email" value={siEmail} onChange={e=>setSiEmail(e.target.value)} placeholder="name@example.com" className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/40"/></InputWithIcon></Field>
        <Field label="Password" right={<Link to="/auth/password-reset" className="text-xs font-medium text-gold hover:underline">Forgot password?</Link>}><InputWithIcon icon={<Lock className="h-4 w-4"/>}><input type={showPassword?"text":"password"} required autoComplete="current-password" value={siPassword} onChange={e=>setSiPassword(e.target.value)} placeholder="Enter your password" className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/40"/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(v=>!v)} className="text-white/50 hover:text-white">{showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></InputWithIcon></Field>
        <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="accent-[color:var(--color-gold)]"/>Remember me for 30 days</label>
        <button disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold-soft to-gold px-5 py-3.5 text-sm font-semibold uppercase tracking-[.12em] text-noir-deep disabled:opacity-60">{submitting?"Signing in…":<>Sign in <ArrowRight className="h-4 w-4"/></>}</button>
      </form>:<form onSubmit={handleSignUp} className="mt-7 space-y-4">
        <Field label="Full name"><InputWithIcon icon={<UserIcon className="h-4 w-4"/>}><input required autoComplete="name" value={suName} onChange={e=>setSuName(e.target.value)} placeholder="Your full name" className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/40"/></InputWithIcon></Field>
        <Field label="Email address"><InputWithIcon icon={<Mail className="h-4 w-4"/>}><input required type="email" autoComplete="email" value={suEmail} onChange={e=>setSuEmail(e.target.value)} placeholder="name@example.com" className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/40"/></InputWithIcon></Field>
        <Field label="Phone (optional)"><InputWithIcon icon={<Phone className="h-4 w-4"/>}><input type="tel" autoComplete="tel" value={suPhone} onChange={e=>setSuPhone(e.target.value)} placeholder="+250 7XX XXX XXX" className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/40"/></InputWithIcon></Field>
        <Field label="Password"><InputWithIcon icon={<Lock className="h-4 w-4"/>} tone={suPassword?(isStrongPassword(suPassword)?"success":"danger"):"normal"}><input type={showPassword?"text":"password"} required autoComplete="new-password" value={suPassword} onChange={e=>setSuPassword(e.target.value)} placeholder="9+ characters, upper, lower, number, symbol" className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/40"/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(v=>!v)} className="text-white/50 hover:text-white">{showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></InputWithIcon><PasswordStrength password={suPassword}/></Field>
        <button disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold-soft to-gold px-5 py-3.5 text-sm font-semibold uppercase tracking-[.12em] text-noir-deep disabled:opacity-60">{submitting?"Creating account…":<>Create account <ArrowRight className="h-4 w-4"/></>}</button>
        <p className="text-xs text-white/50">By creating an account you agree to our terms and privacy policy. A six-digit code will be emailed to verify your address.</p>
      </form>}
      <div className="my-6 flex items-center gap-3"><div className="h-px flex-1 bg-white/15"/><span className="text-[10px] uppercase tracking-[.2em] text-white/40">Or continue with</span><div className="h-px flex-1 bg-white/15"/></div>
      <div className="grid grid-cols-2 gap-3"><button type="button" disabled title="Google sign-in is not enabled" className="glass flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm text-white/40"><GoogleIcon/>Google</button><button type="button" disabled title="Apple sign-in is not enabled" className="glass rounded-full px-4 py-2.5 text-sm text-white/40">Apple</button></div>
      <p className="mt-6 text-center text-sm text-white/60">{mode==="signin"?<>Don't have an account? <button type="button" onClick={()=>{setError(null);setMode("signup")}} className="font-medium text-gold hover:underline">Create account</button></>:<>Already have an account? <button type="button" onClick={()=>{setError(null);setMode("signin")}} className="font-medium text-gold hover:underline">Sign in</button></>}</p>
    </div>
  );
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-noir-deep">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#32281f] via-[#101923] to-[#080b12]" />
      {heroReady && <div className={`absolute inset-0 transition-opacity duration-700 ${heroMediaLoaded ? "opacity-100" : "opacity-0"}`}><AuthHeroMedia video={heroVideo} image={heroImage || DEFAULT_HERO_IMAGE} onReady={() => setHeroMediaLoaded(true)}/></div>}
      <div className="pointer-events-none absolute inset-0 bg-noir-deep/75"/>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-noir-deep/95 via-noir-deep/75 to-noir-deep/55"/>
      <header className="relative z-20 flex items-center justify-between gap-4 px-6 py-6 sm:px-10 lg:px-16">
        <Link to="/" className="inline-flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-noir-deep"><Home className="h-5 w-5"/></span><span className="leading-tight text-white"><span className="block font-display text-xl tracking-wide">NOVAWORKS</span><span className="block max-w-[240px] text-[9px] uppercase tracking-[.2em] text-white/55">Where Prime Property Meets Peace of Mind</span></span></Link>
        <Link to="/" className="glass hidden sm:inline-flex rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[.15em] text-white hover:bg-white/15">Back to site</Link>
      </header>
      <main className="relative z-10 mx-auto grid max-w-[1400px] items-center gap-12 px-6 pb-16 pt-4 sm:px-10 lg:grid-cols-2 lg:px-16 lg:pt-10">
        <div className="hidden lg:block text-white">
          <span className="glass inline-flex rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[.22em] text-gold">Premium Real Estate</span>
          <h2 className="mt-7 font-display text-5xl leading-[1.05] xl:text-6xl">Discover Your <span className="gold-text">Perfect</span><br/>Address</h2>
          <p className="mt-6 max-w-md leading-relaxed text-white/70">Explore exceptional properties, manage your bookings and follow your property journey with NOVAWORKS — Kigali's premium real-estate platform.</p>
          <div className="mt-10 flex flex-wrap gap-7 text-sm text-white/70"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-gold"/>Verified listings</span><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-gold"/>Secure account access</span></div>
        </div>
        <div className="flex justify-center lg:justify-end">{formCard}</div>
      </main>
      {verifyEmail&&<VerifyOtpModal email={verifyEmail} onClose={()=>setVerifyEmail(null)} onSuccess={()=>{setVerifyEmail(null);navigate({to:"/auth/welcome",search:{to:""}})}}/>}
    </div>
  );
}

function AuthHeroMedia({ video, image, onReady }: { video: string; image: string; onReady: () => void }) {
  const parsed = parseVideoUrl(video || "");
  if (parsed.kind === "mp4" || parsed.kind === "webm") return <video src={parsed.embed || video} autoPlay muted loop playsInline preload="metadata" poster={image || undefined} onLoadedData={onReady} onError={onReady} className="absolute inset-0 h-full w-full object-cover auth-media-kenburns" />;
  if ((parsed.kind === "youtube" || parsed.kind === "vimeo") && parsed.embed) {
    let src = parsed.embed;
    if (parsed.kind === "youtube") src += `${src.includes("?") ? "&" : "?"}autoplay=1&mute=1&controls=0&loop=1&playlist=${parsed.id || ""}&playsinline=1`;
    else src += `${src.includes("?") ? "&" : "?"}autoplay=1&muted=1&background=1&loop=1`;
    return <iframe src={src} onLoad={onReady} title="NOVAWORKS sign-in background" className="absolute -inset-[8%] h-[116%] w-[116%] pointer-events-none auth-media-kenburns" allow="autoplay; fullscreen; encrypted-media" />;
  }
  return <img
    src={cfImage(image || DEFAULT_HERO_IMAGE, { width: 1600, quality: 70, format: "auto", fit: "cover" })}
    alt="Luxury property"
    loading="eager"
    decoding="async"
    fetchPriority="high"
    onLoad={onReady}
    onError={(e) => {
      const el = e.currentTarget;
      if (el.src !== DEFAULT_HERO_IMAGE) el.src = DEFAULT_HERO_IMAGE;
      else onReady();
    }}
    className="absolute inset-0 h-full w-full object-cover auth-media-kenburns"
  />;
}

function Field({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-white/90">{label}</span>
        {right}
      </div>
      {children}
    </label>
  );
}

function InputWithIcon({ icon, children, tone = "normal" }: { icon: React.ReactNode; children: React.ReactNode; tone?: "normal" | "danger" | "success" }) {
  const border = tone === "danger" ? "border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-200" : tone === "success" ? "border-emerald-400 focus-within:border-emerald-500 focus-within:ring-emerald-200" : "border-white/35 focus-within:border-gold focus-within:ring-gold/20";
  return (
    <div className={`flex items-center gap-2 rounded-xl border bg-black/35 px-4 py-3 focus-within:ring-2 transition ${border}`}>
      <span className="text-white/45">{icon}</span>
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