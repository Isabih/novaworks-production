import { Link } from "@tanstack/react-router";
import { Bed, Bath, Maximize2, MapPin, Heart, ArrowUpRight, Crown, Building2 } from "lucide-react";
import { type Property, formatPrice, CATEGORY_META } from "@/lib/properties";
import { ProgressiveImage } from "@/components/site/ProgressiveImage";

const STATUS_STYLES: Record<string, string> = {
  available: "bg-emerald-500/15 text-emerald-600",
  sold: "bg-red-500/15 text-red-600",
  rented: "bg-blue-500/15 text-blue-600",
  maintenance: "bg-amber-500/15 text-amber-700",
};

export function PropertyCard({ property: p }: { property: Property }) {
  return (
    <Link
      to="/properties/$slug"
      params={{ slug: p.slug }}
      className="group block bg-card rounded-xl overflow-hidden border border-border hover:shadow-2xl hover:-translate-y-1 transition-all duration-500"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <ProgressiveImage
          src={p.image}
          alt={p.title}
          width={800}
          height={600}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          widths={[400, 600, 800, 1200]}
          containerClassName="absolute inset-0"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          {p.luxury && (
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-gold-soft to-gold text-noir-deep text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md">
              <Crown className="w-3 h-3" /> Luxury
            </span>
          )}
          {p.featured && (
            <span className="bg-noir-deep text-white text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md">
              Featured
            </span>
          )}
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md ${STATUS_STYLES[p.status]}`}>
            {p.status}
          </span>
        </div>
        <button
          aria-label="Save"
          onClick={(e) => e.preventDefault()}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:bg-white transition-colors"
        >
          <Heart className="w-4 h-4 text-noir-deep" />
        </button>
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur px-3 py-1.5 rounded-md text-xs font-medium text-noir-deep">
          {CATEGORY_META[p.category].label} · For {p.listing === "rent" ? "Rent" : "Sale"}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-xl text-foreground leading-snug group-hover:text-gold transition-colors">
            {p.title}
          </h3>
          <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors shrink-0 mt-1" />
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 text-gold" />
          {p.location}, {p.district}
        </div>
        <div className="mt-3 font-display text-2xl text-foreground">{formatPrice(p)}</div>
        {(Number(p.totalUnits || 0) > 0 || p.structureMode === "building" || p.structureMode === "mixed") && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-noir/5 px-3 py-1.5 text-xs text-noir/60">
            <Building2 className="h-3.5 w-3.5 text-gold-dark" />
            <b className="text-noir-deep">{Number(p.availableUnits || 0)}</b> of {Number(p.totalUnits || 0)} unit(s) available
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {p.beds != null && (
              <span className="flex items-center gap-1.5"><Bed className="w-3.5 h-3.5 text-gold" /> {p.beds} Beds</span>
            )}
            {p.baths != null && (
              <span className="flex items-center gap-1.5"><Bath className="w-3.5 h-3.5 text-gold" /> {p.baths} Baths</span>
            )}
          </div>
          <span className="flex items-center gap-1.5"><Maximize2 className="w-3.5 h-3.5 text-gold" /> {p.area} m²</span>
        </div>
      </div>
    </Link>
  );
}