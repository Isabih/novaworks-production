import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Menu, X, Search, ChevronDown, Home, Building2, Castle, Building, Briefcase, MapPin, Square, Store, User as UserIcon, LayoutDashboard, LogOut, Mail, Map as MapIcon, Heart, TrendingUp, Sparkles, Sun, Moon, Image as ImageIcon } from "lucide-react";
import logo from "@/assets/novaworks-logo.png";
import { CATEGORY_META, type PropertyCategory } from "@/lib/properties";
import { useAuth, dashboardPathFor } from "@/lib/use-auth";

const PROPERTY_ICONS: Record<PropertyCategory, any> = {
  apartment: Building2,
  "luxury-apartment": Castle,
  villa: Home,
  building: Building,
  office: Briefcase,
  land: MapPin,
  studio: Square,
  commercial: Store,
};

const MAIN_LINKS = [
  { to: "/", label: "Home" },
  { to: "/services", label: "What we do" },
  { to: "/investors", label: "Invest" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/about", label: "Who we are" },
  { to: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const { user, profile, primaryRole, signOut } = useAuth();
  const [userMenu, setUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [clearHero, setClearHero] = useState(false);
  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("theme")) as "light" | "dark" | null;
    const next = stored === "dark" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem("theme", next); } catch {}
  };
  useEffect(() => {
    try {
      const enabled = localStorage.getItem("nw_clear_hero") === "1";
      setClearHero(enabled);
      document.documentElement.dataset.heroClear = enabled ? "1" : "0";
    } catch {}
  }, []);
  const toggleHeroClarity = () => {
    const next = !clearHero;
    setClearHero(next);
    document.documentElement.dataset.heroClear = next ? "1" : "0";
    try { localStorage.setItem("nw_clear_hero", next ? "1" : "0"); } catch {}
    window.dispatchEvent(new CustomEvent("novaworks:hero-clear", { detail: next }));
  };
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const solid = scrolled || open || megaOpen || userMenu;
  return (
    <>
      {/* Top utility bar */}
      <div className="hidden lg:block fixed top-0 inset-x-0 z-50 bg-noir-deep text-white/70 text-xs">
        <div className="container-luxe flex items-center justify-between h-8">
          <div className="flex items-center gap-5">
            <a href="https://mail.google.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Mail className="w-3.5 h-3.5 text-red-400" /> Gmail
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <span className="w-3.5 h-3.5 rounded-[3px] bg-red-600 inline-flex items-center justify-center text-[8px] font-bold">▶</span> YouTube
            </a>
            <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <MapIcon className="w-3.5 h-3.5 text-emerald-400" /> Maps
            </a>
            <a href="tel:+250793300080" className="hidden xl:flex items-center gap-1.5 hover:text-white transition-colors">
              <span className="text-gold">●</span> +250 793 300 080
            </a>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/luxury-access" className="flex items-center gap-1.5 hover:text-gold transition-colors">
              <Sparkles className="w-3.5 h-3.5 text-gold" /> Luxury Access
            </Link>
            <Link to="/auth" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Heart className="w-3.5 h-3.5" /> Saved
            </Link>
          </div>
        </div>
      </div>

      <header
        className={`fixed inset-x-0 z-40 transition-all duration-500 ease-out lg:top-8 top-0 ${
          solid
            ? "bg-black/95 backdrop-blur-xl border-b border-white/10 shadow-2xl shadow-black/30"
            : "bg-transparent"
        }`}
      >
      <div className="container-luxe flex items-center justify-between h-16 lg:h-20">
        <Link to="/" className="flex items-center gap-3 group">
          <img src={logo} alt="NOVAWORKS" className="h-12 w-12 rounded-md object-cover ring-1 ring-white/10" />
          <div className="leading-tight">
            <div className="font-display text-xl tracking-wide text-white">NOVAWORKS</div>
            <div className="text-[9px] uppercase tracking-[0.16em] text-gold">Digital Real Estate Platform</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 text-sm text-white/90">
          <Link to="/" className="px-3 py-2 rounded-lg hover:text-gold transition-colors [&.active]:text-gold">Home</Link>
          <div
            className="relative"
            onMouseEnter={() => setMegaOpen(true)}
            onMouseLeave={() => setMegaOpen(false)}
          >
            <button className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${megaOpen ? "text-gold" : "hover:text-gold"}`}>
              Properties <ChevronDown className={`w-3.5 h-3.5 transition-transform ${megaOpen ? "rotate-180" : ""}`} />
            </button>
            {megaOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full pt-4 w-[760px] animate-nova-fade-up">
                <div className="bg-noir-deep border border-white/10 rounded-2xl p-6 grid grid-cols-2 gap-2 shadow-2xl">
                  {(Object.keys(CATEGORY_META) as PropertyCategory[]).map((cat) => {
                    const Icon = PROPERTY_ICONS[cat];
                    return (
                      <Link
                        key={cat}
                        to="/properties"
                        search={{ category: cat }}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-md bg-gold/15 text-gold flex items-center justify-center shrink-0 group-hover:bg-gold group-hover:text-noir-deep transition-colors">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-white font-medium group-hover:text-gold transition-colors">{CATEGORY_META[cat].plural}</div>
                          <div className="text-xs text-white/50">{CATEGORY_META[cat].description}</div>
                        </div>
                      </Link>
                    );
                  })}
                  <div className="col-span-2 mt-2 pt-4 border-t border-white/10 flex items-center justify-between">
                    <Link to="/properties" className="text-gold text-sm hover:underline">View all properties →</Link>
                    <Link to="/list-property" className="text-white/70 text-sm hover:text-gold">List your property</Link>
                  </div>
                </div>
              </div>
            )}
          </div>
          {MAIN_LINKS.slice(1).map((l) => (
            <Link key={l.to} to={l.to} className="px-3 py-2 rounded-lg hover:text-gold transition-colors [&.active]:text-gold">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button className="w-9 h-9 rounded-full text-white/80 hover:text-white hover:bg-white/10 inline-flex items-center justify-center transition-colors" aria-label="Search">
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={toggleHeroClarity}
            className={`w-9 h-9 rounded-full inline-flex items-center justify-center transition-colors ${clearHero ? "bg-gold text-noir-deep" : "text-white/80 hover:text-white hover:bg-white/10"}`}
            aria-label="Toggle clear hero image"
            title={clearHero ? "Restore cinematic hero overlay" : "Show hero image without overlay"}
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full text-white/80 hover:text-white hover:bg-white/10 inline-flex items-center justify-center transition-colors"
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {user ? (
            <div className="relative" onMouseLeave={() => setUserMenu(false)}>
              <button
                onClick={() => setUserMenu((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:text-gold"
              >
                <span className="h-6 w-6 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-semibold">
                  {(profile?.full_name ?? user.email ?? "U").trim().charAt(0).toUpperCase()}
                </span>
                <span className="hidden xl:inline">{profile?.full_name ?? user.email}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {userMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-white/10 bg-noir-deep shadow-xl py-2 z-50">
                  <Link
                    to={dashboardPathFor(primaryRole)}
                    onClick={() => setUserMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-gold"
                  >
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                  <button
                    onClick={async () => { setUserMenu(false); await signOut(); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-gold"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/auth" className="text-sm text-white/80 hover:text-gold inline-flex items-center gap-1">
              <UserIcon className="w-4 h-4" /> Sign in
            </Link>
          )}
          <Link
            to="/list-property"
            className="btn-luxury inline-flex items-center gap-2 bg-gradient-to-r from-gold-soft to-gold text-noir-deep px-5 py-2.5 rounded-md font-medium text-sm"
          >
            <Home className="w-4 h-4" /> List Property
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden text-white p-2"
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-white/10 bg-noir-deep">
          <div className="container-luxe py-4 flex flex-col gap-1">
            {MAIN_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-gold py-2 text-sm"
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-3 mt-2 border-t border-white/10">
              <div className="text-xs uppercase tracking-wider text-white/40 mb-2">Properties</div>
              {(Object.keys(CATEGORY_META) as PropertyCategory[]).map((cat) => (
                <Link
                  key={cat}
                  to="/properties"
                  search={{ category: cat }}
                  onClick={() => setOpen(false)}
                  className="block text-white/70 hover:text-gold py-1.5 text-sm"
                >
                  {CATEGORY_META[cat].plural}
                </Link>
              ))}
            </div>
            <Link
              to="/list-property"
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-gold-soft to-gold text-noir-deep px-5 py-3 rounded-md font-medium text-sm"
            >
              List Property
            </Link>
          </div>
        </div>
      )}
      </header>
    </>
  );
}