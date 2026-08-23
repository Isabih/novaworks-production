import { Link } from "@tanstack/react-router";
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Phone, Mail, MapPin, ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { subscribeAndSendOtp } from "@/lib/email.functions";
import { toast } from "sonner";
import logo from "@/assets/novaworks-logo.png";

export function SiteFooter() {
  const sub = useServerFn(subscribeAndSendOtp);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [footerEmail, setFooterEmail] = useState("");

  const submit = async (e: React.FormEvent, mailValue: string, fullName?: string) => {
    e.preventDefault();
    if (!mailValue) return;
    setBusy(true);
    try {
      await sub({ data: { email: mailValue, full_name: fullName } });
      setSuccessEmail(mailValue);
      setEmail(""); setFooterEmail(""); setFirstName(""); setLastName("");
      toast.success("Subscription registered successfully");
      window.setTimeout(() => setSuccessEmail(null), 5500);
    } catch (err: any) { toast.error(err.message ?? "Failed"); }
    finally { setBusy(false); }
  };
  return (
    <>
      {/* CTA strip */}
      <section className="relative bg-noir-deep py-20 overflow-hidden border-y border-white/5">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_left,_var(--color-gold)_0%,_transparent_55%)]" />
        <div className="container-luxe grid lg:grid-cols-2 gap-12 items-center relative">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" /> Get in touch
            </div>
            <h2 className="mt-4 font-display text-4xl md:text-5xl text-white leading-tight">
              Ready to Find Your<br /><span className="text-gold italic">Dream Property?</span>
            </h2>
            <p className="mt-4 text-white/70 max-w-md">
              Let our expert team help you navigate the real estate market. Whether you're buying, selling, or investing — we're here to guide you every step of the way.
            </p>
            <div className="mt-8 grid sm:grid-cols-2 gap-3 max-w-xl">
              <a href="tel:+250793300080" className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-lg transition-colors">
                <div className="w-10 h-10 rounded-md bg-gold/15 text-gold flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-white/50">Call Us</div>
                  <div className="text-sm font-medium text-white">+250 793 300 080</div>
                </div>
              </a>
              <a href="mailto:info@novaworks.rw" className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-lg transition-colors">
                <div className="w-10 h-10 rounded-md bg-gold/15 text-gold flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-white/50">Email Us</div>
                  <div className="text-sm font-medium text-white">info@novaworks.rw</div>
                </div>
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/contact" className="inline-flex items-center gap-2 bg-gradient-to-r from-gold-soft to-gold text-noir-deep px-6 py-3 rounded-md text-sm font-medium hover:shadow-lg hover:shadow-gold/30 transition-all">
                Contact Us Today <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/list-property" className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-white/15 transition-colors">
                List Your Property
              </Link>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur p-8 rounded-2xl border border-white/10">
            <h3 className="font-display text-2xl text-white">Stay Updated</h3>
            <p className="text-sm text-white/60 mt-1">
              Subscribe to our newsletter and be the first to know about new properties, investment opportunities, and market insights.
            </p>
            <form className="mt-5 grid gap-3" onSubmit={(e) => submit(e, email, `${firstName} ${lastName}`.trim())}>
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-md px-4 py-3 text-sm placeholder:text-white/30 outline-none focus:border-gold/50" placeholder="First Name" />
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-white/5 border border-white/10 text-white rounded-md px-4 py-3 text-sm placeholder:text-white/30 outline-none focus:border-gold/50" placeholder="Last Name" />
              </div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="bg-white/5 border border-white/10 text-white rounded-md px-4 py-3 text-sm placeholder:text-white/30 outline-none focus:border-gold/50" placeholder="Email Address" />
              <button type="submit" disabled={busy} className="bg-gradient-to-r from-gold-soft to-gold text-noir-deep rounded-md px-6 py-3 text-sm font-medium hover:shadow-lg hover:shadow-gold/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {busy ? "Sending…" : "Subscribe Now"} <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-xs text-center text-white/50">By subscribing, you agree to our <a className="underline hover:text-gold">Privacy Policy</a></p>
            </form>
          </div>
        </div>
      </section>

      <footer className="bg-noir-deep text-white/80 pt-16 pb-8">
        <div className="container-luxe grid lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <img src={logo} alt="NOVAWORKS" className="h-12 w-12 rounded-md object-cover" />
              <div>
                <div className="font-display text-xl text-white">NOVAWORKS</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-gold">Where Prime Property Meets Peace of Mind</div>
              </div>
            </div>
            <p className="mt-5 text-sm text-white/60 max-w-sm">
              Discover exceptional properties with NOVAWORKS. We specialise in luxury apartments, premium villas, commercial spaces, and investment opportunities in prime locations across Rwanda.
            </p>
            <div className="mt-6">
              <div className="text-xs uppercase tracking-wider text-white/40 mb-2">Subscribe to our newsletter</div>
              <form className="flex" onSubmit={(e) => submit(e, footerEmail)}>
                <input value={footerEmail} onChange={(e) => setFooterEmail(e.target.value)} type="email" placeholder="Enter your email" className="flex-1 bg-white/5 border border-white/10 rounded-l-md px-4 py-3 text-sm placeholder:text-white/30 outline-none focus:border-gold/50" />
                <button type="submit" disabled={busy} className="bg-gold text-noir-deep px-4 rounded-r-md hover:bg-gold-soft transition-colors disabled:opacity-60">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
            <div className="mt-6 flex gap-2">
              {[Facebook, Twitter, Instagram, Linkedin, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-md bg-white/5 border border-white/10 flex items-center justify-center hover:bg-gold hover:text-noir-deep hover:border-gold transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <div className="font-display text-lg text-white mb-4">Properties</div>
            <ul className="space-y-2 text-sm">
              <li><Link to="/properties" search={{ category: "apartment" }} className="hover:text-gold">Apartments</Link></li>
              <li><Link to="/properties" search={{ category: "luxury-apartment" }} className="hover:text-gold">Luxury Apartments</Link></li>
              <li><Link to="/properties" search={{ category: "villa" }} className="hover:text-gold">Villas</Link></li>
              <li><Link to="/properties" search={{ category: "building" }} className="hover:text-gold">Buildings</Link></li>
              <li><Link to="/properties" search={{ category: "office" }} className="hover:text-gold">Offices</Link></li>
              <li><Link to="/properties" search={{ category: "land" }} className="hover:text-gold">Lands / Plots</Link></li>
              <li><Link to="/properties" search={{ category: "studio" }} className="hover:text-gold">Studios</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-display text-lg text-white mb-4">Company</div>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-gold">About Us</Link></li>
              <li><Link to="/services" className="hover:text-gold">Our Services</Link></li>
              <li><Link to="/portfolio" className="hover:text-gold">Portfolio</Link></li>
              <li><Link to="/investors" className="hover:text-gold">Investors</Link></li>
              <li><Link to="/blog" className="hover:text-gold">Blog / Insights</Link></li>
              <li><Link to="/contact" className="hover:text-gold">Contact</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-display text-lg text-white mb-4">Contact Us</div>
            <ul className="space-y-4 text-sm">
              <li className="flex gap-3">
                <Phone className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                <div>
                  <div className="text-white">+250 793 300 080</div>
                  <div className="text-xs text-white/50">Mon – Sat, 8am – 6pm</div>
                </div>
              </li>
              <li className="flex gap-3">
                <Mail className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                <div>
                  <div className="text-white">info@novaworks.rw</div>
                  <div className="text-xs text-white/50">Email us anytime</div>
                </div>
              </li>
              <li className="flex gap-3">
                <MapPin className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                <div>
                  <div className="text-white">Kigali Heights</div>
                  <div className="text-xs text-white/50">KG 7 Ave, Kimihurura<br />Kigali, Rwanda</div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="container-luxe mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row gap-4 justify-between text-xs text-white/50">
          <div>© {new Date().getFullYear()} NOVAWORKS Real Estate. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gold">Privacy Policy</a>
            <a href="#" className="hover:text-gold">Terms of Service</a>
            <a href="#" className="hover:text-gold">Cookie Policy</a>
          </div>
        </div>
      </footer>

      {successEmail && (
        <div className="fixed right-5 bottom-24 z-[100] w-[min(430px,calc(100vw-2.5rem))] animate-nova-fade-up">
          <div className="rounded-2xl border border-emerald-200 bg-white shadow-2xl p-5 flex items-start gap-3 text-noir-deep">
            <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center shrink-0"><CheckCircle2 className="h-5 w-5" /></div>
            <div className="min-w-0">
              <div className="font-semibold">Subscription successfully registered</div>
              <p className="mt-1 text-sm text-noir/60">A welcome email was sent to <b>{successEmail}</b>. You will receive NOVAWORKS updates when new properties are published.</p>
            </div>
          </div>
        </div>
      )}

    </>
  );
}