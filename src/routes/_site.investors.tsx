import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, PieChart, ShieldCheck, Briefcase, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_site/investors")({
  head: () => ({
    meta: [
      { title: "Investors — NOVAWORKS Real Estate" },
      { name: "description", content: "Investment opportunities in prime Rwandan real estate. NOVAWORKS partners with institutional and private investors." },
    ],
  }),
  component: InvestorsPage,
});

function InvestorsPage() {
  return (
    <div>
      <section className="relative bg-noir-deep text-white py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80" className="w-full h-full object-cover" alt="" />
        </div>
        <div className="container-luxe relative max-w-3xl">
          <div className="text-xs uppercase tracking-[0.2em] text-gold">For Investors</div>
          <h1 className="mt-4 font-display text-5xl md:text-7xl">Capital at home in Rwanda.</h1>
          <p className="mt-4 text-white/70 text-lg">We partner with institutional capital and private investors to source, develop and manage income-producing real estate.</p>
        </div>
      </section>
      <section className="py-20">
        <div className="container-luxe grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { i: TrendingUp, t: "Yield-focused", d: "Targeted 8–12% net yields across managed assets." },
            { i: PieChart, t: "Diversified", d: "Residential, commercial and land across districts." },
            { i: ShieldCheck, t: "Vetted", d: "Every opportunity due-diligenced by our team." },
            { i: Briefcase, t: "Hands-off", d: "Full property and tenant management included." },
          ].map((v) => (
            <div key={v.t} className="bg-card border border-border rounded-xl p-6">
              <div className="w-12 h-12 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                <v.i className="w-6 h-6" />
              </div>
              <div className="mt-4 font-display text-xl">{v.t}</div>
              <div className="mt-1.5 text-sm text-muted-foreground">{v.d}</div>
            </div>
          ))}
        </div>
        <div className="container-luxe mt-16 text-center">
          <Link to="/contact" className="inline-flex items-center gap-2 bg-noir-deep text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-noir transition-colors">
            Request the investor brief <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}