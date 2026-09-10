import {Link} from "@tanstack/react-router";
import {Bed,Bath,Maximize2,MapPin,ArrowUpRight,Crown} from "lucide-react";
import {type Property,formatPrice,CATEGORY_META} from "@/lib/properties";
import {ProgressiveImage} from "@/components/site/ProgressiveImage";
const STATUS_STYLES:Record<string,string>={available:"bg-emerald-500/20 text-emerald-100",sold:"bg-red-500/20 text-red-100",rented:"bg-blue-500/20 text-blue-100",maintenance:"bg-amber-500/20 text-amber-100"};
export function PropertyCard({property:p}:{property:Property}){
 return <Link to="/properties/$slug" params={{slug:p.slug}} className="group relative block min-h-[440px] overflow-hidden rounded-2xl border border-white/10 bg-noir-deep shadow-xl hover:-translate-y-1 hover:border-gold/40 transition-all duration-500">
  <ProgressiveImage src={p.image} alt={p.title} width={800} height={600} sizes="(min-width:1024px) 33vw,(min-width:640px) 50vw,100vw" widths={[400,600,800,1200]} containerClassName="absolute inset-0" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/>
  <div className="absolute inset-0 bg-gradient-to-t from-noir-deep via-noir-deep/15 to-noir-deep/10"/>
  <div className="absolute top-3 left-3 flex flex-wrap gap-2">{p.luxury&&<span className="inline-flex items-center gap-1 rounded-md bg-gold px-2.5 py-1 text-[10px] uppercase font-semibold text-noir-deep"><Crown className="h-3 w-3"/>Luxury</span>}{p.featured&&<span className="glass-dark rounded-md px-2.5 py-1 text-[10px] uppercase font-semibold text-white">Featured</span>}<span className={`rounded-md px-2.5 py-1 text-[10px] uppercase font-semibold ${STATUS_STYLES[p.status]||"glass-dark text-white"}`}>{p.status}</span></div>
  <div className="absolute top-14 left-3 glass-dark rounded-md px-3 py-1.5 text-xs text-white/80">{CATEGORY_META[p.category]?.label||"Property"} · For {p.listing==="rent"?"Rent":"Sale"}</div>
  <div className="absolute inset-x-0 bottom-0 p-5 pt-28 text-white">
   <div className="flex items-start justify-between gap-3"><h3 className="font-display text-2xl leading-snug group-hover:text-gold transition-colors">{p.title}</h3><ArrowUpRight className="h-4 w-4 shrink-0 mt-1 text-white/50 group-hover:text-gold"/></div>
   <p className="mt-2 flex items-center gap-1.5 text-xs text-white/60"><MapPin className="h-3 w-3 text-gold"/>{[p.location,p.district].filter(Boolean).join(", ")}</p>
   <div className="mt-3 font-display text-xl">{formatPrice(p)}</div>
   <div className="mt-4 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs text-white/65"><div className="flex gap-3">{p.beds!=null&&<span className="flex items-center gap-1.5"><Bed className="h-3.5 w-3.5 text-gold"/>{p.beds} Beds</span>}{p.baths!=null&&<span className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5 text-gold"/>{p.baths} Baths</span>}</div>{p.area>0&&<span className="flex items-center gap-1.5"><Maximize2 className="h-3.5 w-3.5 text-gold"/>{p.area} m²</span>}</div>
  </div>
 </Link>;
}
