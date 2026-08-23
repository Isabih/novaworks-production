import { createFileRoute } from "@tanstack/react-router";
import { Upload, Camera, FileText, CheckCircle2, ArrowRight } from "lucide-react";
import { CATEGORY_META, type PropertyCategory } from "@/lib/properties";

export const Route = createFileRoute("/_site/list-property")({
  head: () => ({
    meta: [
      { title: "List Your Property — NOVAWORKS" },
      { name: "description", content: "Partner with NOVAWORKS to list and market your property to vetted, qualified buyers and tenants." },
    ],
  }),
  component: ListPage,
});

function ListPage() {
  return (
    <div>
      <section className="bg-noir-deep text-white py-20">
        <div className="container-luxe max-w-3xl">
          <div className="text-xs uppercase tracking-[0.2em] text-gold">For Owners</div>
          <h1 className="mt-4 font-display text-5xl md:text-6xl">List your property with NOVAWORKS.</h1>
          <p className="mt-4 text-white/60">We market discreetly, qualify rigorously and close confidently — for owners who value their time and their asset.</p>
        </div>
      </section>

      <section className="py-20">
        <div className="container-luxe grid lg:grid-cols-[1.2fr_1fr] gap-12">
          <form className="bg-card border border-border rounded-2xl p-8 space-y-6">
            <div className="font-display text-2xl">Tell us about your property</div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Owner full name" placeholder="John Doe" />
              <Field label="Email" type="email" placeholder="you@example.com" />
              <Field label="Phone" type="tel" placeholder="+250 …" />
              <Select label="Category">
                {(Object.keys(CATEGORY_META) as PropertyCategory[]).map((c) => (
                  <option key={c}>{CATEGORY_META[c].label}</option>
                ))}
              </Select>
              <Field label="Location" placeholder="Kimihurura" />
              <Field label="District" placeholder="Gasabo" />
              <Field label="Asking price (USD)" type="number" placeholder="850000" />
              <Select label="Listing type"><option>For Sale</option><option>For Rent</option></Select>
              <Field label="Bedrooms" type="number" placeholder="4" />
              <Field label="Bathrooms" type="number" placeholder="3" />
              <Field label="Area (m²)" type="number" placeholder="320" />
              <Field label="Year built" type="number" placeholder="2022" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Description</label>
              <textarea rows={4} className="bg-muted rounded-md px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/30" placeholder="Describe the property's standout features..." />
            </div>

            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-gold/50 transition-colors cursor-pointer">
              <Camera className="w-8 h-8 mx-auto text-gold" />
              <div className="mt-3 font-medium">Upload property images</div>
              <div className="text-xs text-muted-foreground mt-1">Drag & drop or click — JPG/PNG up to 10MB each</div>
              <button type="button" className="mt-4 inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-md text-sm">
                <Upload className="w-4 h-4" /> Select files
              </button>
            </div>

            <Field label="Video tour URL (optional)" placeholder="https://youtube.com/..." />

            <button className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-gold-soft to-gold text-noir-deep px-6 py-3.5 rounded-md font-medium">
              Submit Listing <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="lg:sticky lg:top-28 self-start space-y-4">
            <div className="bg-noir-deep text-white p-8 rounded-2xl">
              <div className="font-display text-2xl">Why list with us?</div>
              <ul className="mt-5 space-y-3 text-sm">
                {[
                  "Marketed to a vetted client list of HNW buyers and tenants",
                  "Professional photography and 3D tours included",
                  "Discreet, off-market option available",
                  "Transparent commission and reporting",
                  "Dedicated NOVAWORKS account manager",
                ].map((b) => (
                  <li key={b} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-gold shrink-0 mt-0.5" /> <span className="text-white/80">{b}</span></li>
                ))}
              </ul>
            </div>
            <div className="bg-card border border-border p-6 rounded-2xl">
              <FileText className="w-6 h-6 text-gold" />
              <div className="mt-3 font-display text-xl">What happens next?</div>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><span className="text-foreground font-medium">1.</span> Our team reviews your submission within 24 hours.</li>
                <li><span className="text-foreground font-medium">2.</span> We schedule an inspection and photography visit.</li>
                <li><span className="text-foreground font-medium">3.</span> Your listing goes live and starts reaching buyers.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input {...rest} className="bg-muted rounded-md px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/30" />
    </div>
  );
}

function Select({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <select className="bg-muted rounded-md px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/30">{children}</select>
    </div>
  );
}