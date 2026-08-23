import { createFileRoute } from "@tanstack/react-router";
import { Calendar, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_site/blog")({
  head: () => ({
    meta: [
      { title: "Insights — NOVAWORKS Real Estate Blog" },
      { name: "description", content: "Market insights, neighbourhood guides and investment perspectives from NOVAWORKS Real Estate." },
    ],
  }),
  component: BlogPage,
});

const POSTS = [
  { t: "The Kigali Skyline: A 2026 Market Report", e: "What's driving demand in Kimihurura, Nyarutarama and Gacuriro this year.", i: "photo-1486406146926-c627a92ad1ab", d: "Mar 12, 2026", c: "Market Report" },
  { t: "Off-Market: The Quiet Side of Luxury", e: "How discreet sourcing protects sellers and finds the right buyers.", i: "photo-1600596542815-ffad4c1539a9", d: "Feb 28, 2026", c: "Insights" },
  { t: "Investing in Rwandan Land", e: "Three things every first-time land investor should evaluate.", i: "photo-1500382017468-9049fed747ef", d: "Feb 14, 2026", c: "Investment" },
  { t: "Villa Trends: Materials That Age Well", e: "Travertine, oak and brushed brass — building for the next decade.", i: "photo-1613490493576-7fde63acd811", d: "Jan 30, 2026", c: "Design" },
  { t: "Corporate Leasing in Kigali", e: "What multinationals look for when housing executives in Rwanda.", i: "photo-1497366216548-37526070297c", d: "Jan 15, 2026", c: "Corporate" },
  { t: "From Tenant to Owner: A 24-Month Plan", e: "A practical roadmap to your first apartment purchase.", i: "photo-1502672260266-1c1ef2d93688", d: "Jan 03, 2026", c: "Guides" },
];

function BlogPage() {
  return (
    <div>
      <section className="bg-noir-deep text-white py-20">
        <div className="container-luxe max-w-3xl">
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Insights</div>
          <h1 className="mt-4 font-display text-5xl md:text-6xl">The NOVAWORKS Journal.</h1>
          <p className="mt-4 text-white/60">Market intelligence, design dispatches and neighbourhood notes.</p>
        </div>
      </section>
      <section className="py-20">
        <div className="container-luxe grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {POSTS.map((p) => (
            <article key={p.t} className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all">
              <div className="aspect-[4/3] overflow-hidden">
                <img src={`https://images.unsplash.com/${p.i}?auto=format&fit=crop&w=900&q=80`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="bg-gold/10 text-gold px-2 py-0.5 rounded">{p.c}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {p.d}</span>
                </div>
                <h2 className="mt-3 font-display text-xl text-foreground group-hover:text-gold transition-colors">{p.t}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{p.e}</p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-gold text-sm font-medium">
                  Read article <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}