import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, LayoutGrid, List, X, Crown, Building2, Castle, Home, Building, Briefcase, MapPin, Square, Store } from "lucide-react";
import { CATEGORY_META, type Property, type PropertyCategory } from "@/lib/properties";
import { fetchActiveProperties } from "@/lib/properties-public";
import { PropertyCard } from "@/components/site/PropertyCard";

type PropSearch = { category?: PropertyCategory; listing?: "sale" | "rent"; status?: "available" | "sold"; city?: string; query?: string; minPrice?: string; maxPrice?: string };

export const Route = createFileRoute("/_site/properties/")({
  validateSearch: (s: Record<string, unknown>): PropSearch => ({
    category: (s.category as PropertyCategory) || undefined,
    listing: s.listing === "sale" || s.listing === "rent" ? s.listing : undefined,
    status: s.status === "available" || s.status === "sold" ? s.status : undefined,
    city: typeof s.city==="string" ? s.city : undefined,
    query: typeof s.query==="string" ? s.query : undefined,
    minPrice: typeof s.minPrice==="string" ? s.minPrice : undefined,
    maxPrice: typeof s.maxPrice==="string" ? s.maxPrice : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Browse Properties — NOVAWORKS" },
      { name: "description", content: "Browse premium apartments, villas, offices, lands and luxury residences across Rwanda." },
    ],
  }),
  component: PropertiesPage,
});

const CAT_ICONS: Record<PropertyCategory, any> = {
  apartment: Building2, "luxury-apartment": Castle, villa: Home, building: Building,
  office: Briefcase, land: MapPin, studio: Square, commercial: Store,
};

function PropertiesPage() {
  const { category, listing, status, city: initialCity, query: initialQuery, minPrice: initialMin, maxPrice: initialMax } = Route.useSearch() as PropSearch;
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState(initialQuery ?? "");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [city, setCity] = useState(initialCity ?? "");
  const [minPrice, setMinPrice] = useState(initialMin ?? "");
  const [maxPrice, setMaxPrice] = useState(initialMax ?? "");
  const [minBedrooms, setMinBedrooms] = useState("");
  const [sort, setSort] = useState<"newest" | "price-asc" | "price-desc">("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [dbProps, setDbProps] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveProperties().then((rows) => { setDbProps(rows); setLoading(false); });
  }, []);

  const filtered = dbProps.filter((p) => {
    if (category && p.category !== category) return false;
    if (listing && p.listing !== listing) return false;
    if (status && p.status !== status) return false;
    if (query && !`${p.title} ${p.location}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (city && !(p.location || "").toLowerCase().includes(city.toLowerCase())) return false;
    if (minPrice && Number(p.price || 0) < Number(minPrice)) return false;
    if (maxPrice && Number(p.price || 0) > Number(maxPrice)) return false;
    if (minBedrooms && Number(p.beds || 0) < Number(minBedrooms)) return false;
    return true;
  }).sort((a, b) => {
    if (sort === "price-asc") return Number(a.price || 0) - Number(b.price || 0);
    if (sort === "price-desc") return Number(b.price || 0) - Number(a.price || 0);
    return 0;
  });

  const advancedFilterCount = [city, minPrice, maxPrice, minBedrooms].filter(Boolean).length;

  const headerMeta = category ? CATEGORY_META[category as PropertyCategory] : { plural: "All Properties", description: "Discover the full NOVAWORKS portfolio" };

  return (
    <div>
      {/* Page hero */}
      <section className="bg-noir-deep text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="container-luxe relative">
          <div className="text-xs text-white/50 mb-6">
            <Link to="/" className="hover:text-gold">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/properties" className="hover:text-gold">Properties</Link>
            {category && (<><span className="mx-2">/</span><span className="text-white">{CATEGORY_META[category].plural}</span></>)}
          </div>
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-xl bg-gold/15 text-gold flex items-center justify-center">
              {category ? (() => { const I = CAT_ICONS[category as PropertyCategory]; return <I className="w-7 h-7" />; })() : <Crown className="w-7 h-7" />}
            </div>
            <div>
              <h1 className="font-display text-5xl md:text-6xl">{headerMeta.plural}</h1>
              <p className="mt-2 text-white/60">{headerMeta.description}</p>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            <CatChip active={!category} onClick={() => navigate({ search: {} as PropSearch })} label="All Properties" />
            {(Object.keys(CATEGORY_META) as PropertyCategory[]).map((c) => {
              const I = CAT_ICONS[c];
              return (
                <CatChip
                  key={c}
                  active={category === c}
                  onClick={() => navigate({ search: (prev: PropSearch) => ({ ...prev, category: c }) })}
                  label={CATEGORY_META[c].plural}
                  icon={<I className="w-3.5 h-3.5" />}
                />
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <CatChip active={!listing && !status} onClick={() => navigate({ search: (p: PropSearch) => ({ ...p, listing: undefined, status: undefined }) })} label="Any status" />
            <CatChip active={listing === "sale"} onClick={() => navigate({ search: (p: PropSearch) => ({ ...p, listing: "sale", status: undefined }) })} label="For Sale" />
            <CatChip active={listing === "rent"} onClick={() => navigate({ search: (p: PropSearch) => ({ ...p, listing: "rent", status: undefined }) })} label="For Rent" />
            <CatChip active={status === "sold"} onClick={() => navigate({ search: (p: PropSearch) => ({ ...p, status: "sold", listing: undefined }) })} label="Sold" />
          </div>
        </div>
      </section>

      {/* Search/filter bar */}
      <section className="border-b border-border bg-background sticky top-[88px] z-30">
        <div className="container-luxe py-4 flex items-center gap-3 flex-wrap">
          <div className="flex-1 flex items-center gap-2 bg-muted rounded-md px-4 py-2.5 min-w-[260px]">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, location..."
              className="bg-transparent outline-none text-sm flex-1"
            />
          </div>
          <button onClick={() => setShowFilters((v) => !v)} className="inline-flex items-center gap-2 bg-card border border-border rounded-md px-4 py-2.5 text-sm hover:border-gold/50">
            <SlidersHorizontal className="w-4 h-4" /> Filters
            {advancedFilterCount > 0 && <span className="bg-gold text-noir-deep text-xs font-semibold px-1.5 rounded">{advancedFilterCount}</span>}
          </button>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="bg-card border border-border rounded-md px-3 py-2.5 text-sm">
            <option value="newest">Newest First</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
          <div className="flex border border-border rounded-md overflow-hidden">
            <button onClick={() => setView("grid")} className={`p-2.5 ${view === "grid" ? "bg-noir-deep text-white" : "bg-card text-muted-foreground"}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setView("list")} className={`p-2.5 ${view === "list" ? "bg-noir-deep text-white" : "bg-card text-muted-foreground"}`}><List className="w-4 h-4" /></button>
          </div>
        </div>
        {showFilters && (
          <div className="container-luxe pb-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / district" className="bg-card border border-border rounded-md px-3 py-2.5 text-sm outline-none" />
            <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} type="number" min="0" placeholder="Min price" className="bg-card border border-border rounded-md px-3 py-2.5 text-sm outline-none" />
            <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} type="number" min="0" placeholder="Max price" className="bg-card border border-border rounded-md px-3 py-2.5 text-sm outline-none" />
            <input value={minBedrooms} onChange={(e) => setMinBedrooms(e.target.value)} type="number" min="0" placeholder="Min bedrooms" className="bg-card border border-border rounded-md px-3 py-2.5 text-sm outline-none" />
            <button onClick={() => { setCity(""); setMinPrice(""); setMaxPrice(""); setMinBedrooms(""); }} className="bg-muted border border-border rounded-md px-3 py-2.5 text-sm hover:border-gold/50">Clear filters</button>
          </div>
        )}
        {category && (
          <div className="container-luxe pb-4 flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Active filters:</span>
            <button
              onClick={() => navigate({ search: {} })}
              className="inline-flex items-center gap-2 bg-muted rounded-full px-3 py-1 text-xs hover:bg-gold/20"
            >
              {CATEGORY_META[category as PropertyCategory].plural} <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </section>

      <section className="py-12">
        <div className="container-luxe">
          <div className="text-sm text-muted-foreground mb-6">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> properties
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Crown className="w-12 h-12 mx-auto text-gold/40" />
              <p className="mt-4">No properties match your filters yet.</p>
            </div>
          ) : view === "grid" ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p) => <PropertyCard key={p.id} property={p} />)}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((p) => <PropertyCard key={p.id} property={p} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function CatChip({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs transition-colors ${
        active ? "bg-gold text-noir-deep font-medium" : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
      }`}
    >
      {icon} {label}
    </button>
  );
}