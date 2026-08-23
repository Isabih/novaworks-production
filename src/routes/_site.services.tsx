import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, Key, Building2, ShoppingBag, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_site/services")({
  head: () => ({
    meta: [
      { title: "What We Do — NOVAWORKS Real Estate" },
      { name: "description", content: "We manage, rent, sell and help you buy premium properties across Rwanda." },
    ],
  }),
  component: ServicesPage,
});

const SERVICES = [
  { i: Building2, t: "Manage", d: "Full-service property management for absentee and institutional owners — tenants, maintenance, reporting and rent collection handled end-to-end." },
  { i: Key, t: "Rent", d: "Find your next home or lease your property to vetted, qualified tenants with bespoke matching and white-glove handover." },
  { i: ShoppingBag, t: "Sell", d: "List and sell your property with expert pricing, premium marketing reach and proven negotiation across Kigali's prime market." },
  { i: Home, t: "Buy", d: "Discover off-market estates, premium apartments and investment-grade buildings — curated to match your lifestyle and budget." },
];

function ServicesPage() {
  return (
    <div>
      <section className="bg-noir-deep text-white py-24">
        <div className="container-luxe text-center max-w-3xl mx-auto">
          <div className="text-xs uppercase tracking-[0.2em] text-gold">What We Do</div>
          <h1 className="mt-4 font-display text-5xl md:text-6xl">Manage. Rent. Sell. Buy.</h1>
          <p className="mt-4 text-white/60">Four pillars, one promise — exceptional real estate, handled with discretion.</p>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container-luxe">
          <div className="grid md:grid-cols-2 gap-6">
            {SERVICES.map((s) => (
              <div key={s.t} className="bg-card border border-border rounded-xl p-7 hover:border-gold/50 hover:shadow-xl transition-all group">
                <div className="w-12 h-12 rounded-lg bg-gold/10 text-gold flex items-center justify-center group-hover:bg-gold group-hover:text-noir-deep transition-colors">
                  <s.i className="w-6 h-6" />
                </div>
                <div className="mt-5 font-display text-2xl text-foreground">{s.t}</div>
                <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.d}</div>
                <Link to="/contact" className="mt-5 inline-flex items-center gap-1.5 text-gold text-sm font-medium hover:gap-2 transition-all">
                  Learn More <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}