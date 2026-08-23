import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Bed, Bath, Maximize2, Car, MapPin, Crown, Heart, Share2, Phone, Mail, MessageCircle,
  Check, ArrowLeft, Play, Image as ImageIcon, Box, FileText, Lock, Star, Printer,
  Bell, Download, ShoppingBag, CalendarCheck, Utensils, Hospital, School, Train, Trees, Landmark, ExternalLink,
} from "lucide-react";
import {
  formatPrice, CATEGORY_META, ROOM_META,
  type Property, type RoomCategory, type RoomImage, type NeighborhoodPlace,
} from "@/lib/properties";
import { fetchPropertyForView } from "@/lib/properties-view.functions";
import { PropertyCard } from "@/components/site/PropertyCard";
import { ProgressiveImage } from "@/components/site/ProgressiveImage";
import { VideoPlayer } from "@/components/site/VideoPlayer";
import { Lightbox } from "@/components/site/Lightbox";
import { LuxuryGate, hasLuxuryAccess } from "@/components/site/LuxuryGate";
import { prefetchImage, prefetchImages } from "@/lib/image-prefetch";
import { createVisitRequest } from "@/lib/visit-requests.functions";
import { useAuth } from "@/lib/use-auth";
import { PropertyBookingModal } from "@/components/site/PropertyBookingModal";

export const Route = createFileRoute("/_site/properties/$slug")({
  loader: async ({ params }) => {
    const property = await fetchPropertyForView({ data: { slug: params.slug } });
    if (!property) throw notFound();
    return { property };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.property.title} — NOVAWORKS` },
      { name: "description", content: loaderData.property.description },
      { property: "og:title", content: loaderData.property.title },
      { property: "og:description", content: loaderData.property.description },
      { property: "og:image", content: loaderData.property.image },
    ] : [],
  }),
  component: PropertyDetail,
  notFoundComponent: () => (
    <div className="container-luxe py-32 text-center">
      <h1 className="font-display text-4xl">Property not found</h1>
      <Link to="/properties" className="mt-6 inline-block text-gold">← Back to properties</Link>
    </div>
  ),
});

function PropertyDetail() {
  const { property: initial } = Route.useLoaderData() as { property: Property & { locked?: boolean } };
  const [p, setP] = useState<Property & { locked?: boolean }>(initial);
  const unlock = useServerFn(fetchPropertyForView);
  // If visitor has a luxury access token, re-fetch the unlocked version server-side.
  useEffect(() => {
    if (!p.luxury || !p.locked) return;
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("nw_luxury_token");
    if (!token) return;
    unlock({ data: { slug: p.slug, luxuryToken: token } })
      .then((fresh) => { if (fresh) setP(fresh); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.slug]);
  const roomGallery: RoomImage[] = p.roomGallery
    ?? (p.gallery?.map((g) => ({ room: "other" as RoomCategory, label: g.label, src: g.src })))
    ?? [{ room: "main", src: p.image }];
  const rooms = Array.from(new Set(roomGallery.map((g) => g.room)));
  const [activeRoom, setActiveRoom] = useState<RoomCategory | "all">("all");
  const [mediaTab, setMediaTab] = useState<"photos" | "video" | "tour" | "floorplan">("photos");
  const [lightbox, setLightbox] = useState<{ images: { src: string; label?: string }[]; idx: number } | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingApartmentId,setBookingApartmentId]=useState<string|null>(null);
  const [visitApartmentId,setVisitApartmentId]=useState<string|null>(null);
  const { user, roles } = useAuth();
  // Luxury gate: if property is luxury and visitor has no access token, block content
  useEffect(() => {
    if (p.luxury && p.locked && !hasLuxuryAccess()) setGateOpen(true);
    else setGateOpen(false);
  }, [p.luxury, p.locked]);
  const filtered = activeRoom === "all" ? roomGallery : roomGallery.filter((g) => g.room === activeRoom);
  const toLightboxImages = (set: RoomImage[]) =>
    set.map((g) => ({ src: g.src, label: g.label ?? ROOM_META[g.room].label }));
  const openLightbox = (set: RoomImage[], src: string) => {
    const images = toLightboxImages(set);
    const idx = Math.max(0, set.findIndex((g) => g.src === src));
    setLightbox({ images, idx });
  };
  // Warm the cache with the first few images of a given section.
  const warmSection = (room: RoomCategory | "all") => {
    const set = room === "all" ? roomGallery : roomGallery.filter((g) => g.room === room);
    prefetchImages(set.slice(0, 4).map((g) => g.src));
  };
  // When a section is active, also warm the first images of adjacent sections
  // so switching tabs feels instant.
  useEffect(() => {
    if (rooms.length <= 1) return;
    const order: (RoomCategory | "all")[] = ["all", ...rooms];
    const i = order.indexOf(activeRoom);
    if (i === -1) return;
    const prev = order[(i - 1 + order.length) % order.length];
    const next = order[(i + 1) % order.length];
    warmSection(prev);
    warmSection(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom]);
  const related: Property[] = [];
  const heroMain = roomGallery[0];
  const heroSide = roomGallery.slice(1, 5);
  const extraCount = Math.max(0, roomGallery.length - 5);
  useEffect(() => {
    if (!user || !roles.includes("customer")) return;
    try {
      const wanted = localStorage.getItem("nw_open_booking_after_auth");
      if (wanted === p.slug) { const unit=localStorage.getItem("nw_booking_apartment_id"); localStorage.removeItem("nw_open_booking_after_auth"); localStorage.removeItem("nw_booking_apartment_id"); if(unit)setBookingApartmentId(unit); setBookingOpen(true); }
    } catch {}
  }, [user, roles, p.slug]);

  return (
    <div className="bg-background">
      {gateOpen && <LuxuryGate slug={p.slug} />}
      <PropertyBookingModal open={bookingOpen} onClose={() => {setBookingOpen(false);setBookingApartmentId(null)}} property={p} initialApartmentId={bookingApartmentId} />
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.idx}
          onClose={() => setLightbox(null)}
          onIndexChange={(i) => setLightbox((l) => (l ? { ...l, idx: i } : l))}
        />
      )}
      {/* Hero collage */}
      <section className="bg-noir-deep pt-6">
        <div className="container-luxe">
          <Link to="/properties" className="inline-flex items-center gap-2 text-white/60 hover:text-gold text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to properties
          </Link>

          <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-2 gap-2 h-[360px] md:h-[480px] rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => openLightbox(roomGallery, heroMain.src)}
              className="col-span-2 row-span-2 relative group cursor-zoom-in"
            >
              <ProgressiveImage src={heroMain.src} alt={heroMain.label ?? ROOM_META[heroMain.room].label} priority width={1200} height={960} widths={[640,900,1200,1600]} sizes="(min-width:1024px) 50vw, 100vw" containerClassName="absolute inset-0" className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 flex gap-2">
                {p.luxury && (
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-gold-soft to-gold text-noir-deep text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-md">
                    <Crown className="w-3 h-3" /> Luxury
                  </span>
                )}
              </div>
            </button>
            {heroSide.map((g, i) => (
              <button
                type="button"
                key={i}
                onClick={() => openLightbox(roomGallery, g.src)}
                className="relative cursor-zoom-in group hidden md:block"
              >
                <ProgressiveImage src={g.src} alt={g.label ?? ROOM_META[g.room].label} width={700} height={480} widths={[360,520,700,1000]} sizes="(min-width:1024px) 25vw, 50vw" containerClassName="absolute inset-0" className="w-full h-full object-cover" />
                {i === heroSide.length - 1 && extraCount > 0 && (
                  <div className="absolute inset-0 bg-noir-deep/55 flex items-center justify-center text-white">
                    <Maximize2 className="w-5 h-5 mr-1" /> +{extraCount} more
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Title + price band */}
          <div className="relative -mb-12 mt-8">
            <div className="bg-card text-foreground rounded-2xl shadow-2xl p-7 grid lg:grid-cols-[1fr_auto] gap-6 items-start border border-border">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {p.luxury && <Pill icon={<Crown className="w-3 h-3" />} className="bg-gold/15 text-gold">Luxury</Pill>}
                  <Pill className="bg-muted text-foreground">{CATEGORY_META[p.category].label}</Pill>
                  <Pill className="bg-emerald-500/15 text-emerald-600 capitalize">{p.status}</Pill>
                </div>
                <h1 className="font-display text-3xl md:text-4xl">{p.title}</h1>
                <div className="mt-2 flex items-center gap-1.5 text-muted-foreground text-sm">
                  <MapPin className="w-4 h-4 text-gold" /> {p.address}, {p.district}
                </div>
              </div>
              <div className="lg:text-right">
                <div className="font-display text-3xl">{formatPrice(p)}</div>
                <div className="text-xs text-muted-foreground">{p.priceUnit === "month" ? "Monthly" : "Sale Price"}</div>
                <div className="mt-4 flex lg:justify-end gap-2">
                  <IconBtn><Heart className="w-4 h-4" /></IconBtn>
                  <IconBtn><Share2 className="w-4 h-4" /></IconBtn>
                  <IconBtn><Printer className="w-4 h-4" /></IconBtn>
                  <button type="button" onClick={() => {
                    if (!user || !roles.includes("customer")) {
                      try {
                        localStorage.setItem("nw_post_auth_redirect", `/properties/${p.slug}`);
                        localStorage.setItem("nw_open_booking_after_auth", p.slug);
                        if (user && !roles.includes("customer")) localStorage.removeItem("novaworks_session");
                      } catch {}
                      window.location.href = "/auth";
                      return;
                    }
                    setBookingOpen(true);
                  }} className="inline-flex items-center gap-2 rounded-md border border-gold bg-gold px-5 py-2 text-sm font-bold text-noir-deep shadow-[0_8px_22px_rgba(216,164,75,.25)] transition hover:-translate-y-0.5 hover:shadow-xl">
                    <CalendarCheck className="w-4 h-4" /> Book Apartment
                  </button>
                  <a href={`mailto:${p.agent?.email ?? "info@novaworks.rw"}`} className="inline-flex items-center gap-2 bg-noir-deep text-white border border-white/10 text-sm font-medium px-5 py-2 rounded-md hover:bg-noir transition">
                    <Mail className="w-4 h-4" /> Inquire Now
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pt-20 pb-8">
        <div className="container-luxe grid lg:grid-cols-[1fr_380px] gap-10">
          {/* MAIN */}
          <div className="space-y-12">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {p.beds != null && <Stat icon={<Bed className="w-5 h-5" />} value={p.beds} label="Bedrooms" />}
              {p.baths != null && <Stat icon={<Bath className="w-5 h-5" />} value={p.baths} label="Bathrooms" />}
              <Stat icon={<Maximize2 className="w-5 h-5" />} value={p.area} label="Sq. Meters" />
              {p.parking != null && p.parking > 0 && <Stat icon={<Car className="w-5 h-5" />} value={p.parking} label="Parking" />}
            </div>

            {/* Media & Tours */}
            <Section title="Media & Tours">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1.5 rounded-xl bg-muted">
                <MediaTab active={mediaTab === "photos"} onClick={() => setMediaTab("photos")} icon={<ImageIcon className="w-4 h-4" />} label="Photos" />
                <MediaTab active={mediaTab === "video"} onClick={() => setMediaTab("video")} icon={<Play className="w-4 h-4" />} label="Video" />
                <MediaTab active={mediaTab === "tour"} onClick={() => setMediaTab("tour")} icon={<Box className="w-4 h-4" />} label="3D Tour" />
                <MediaTab active={mediaTab === "floorplan"} onClick={() => setMediaTab("floorplan")} icon={<FileText className="w-4 h-4" />} label="Floor Plan" />
              </div>

              {mediaTab === "photos" && (
                <>
                  {rooms.length > 1 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      <RoomChip active={activeRoom === "all"} onClick={() => setActiveRoom("all")}>All ({roomGallery.length})</RoomChip>
                      {rooms.map((r) => (
                        <RoomChip
                          key={r}
                          active={activeRoom === r}
                          onClick={() => setActiveRoom(r)}
                          onMouseEnter={() => warmSection(r)}
                          onFocus={() => warmSection(r)}
                        >
                          {ROOM_META[r].label} ({roomGallery.filter((g) => g.room === r).length})
                        </RoomChip>
                      ))}
                    </div>
                  )}
                  <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {filtered.map((g, i) => (
                      <figure
                        key={i}
                        onClick={() => openLightbox(filtered, g.src)}
                        onMouseEnter={() => {
                          prefetchImage(g.src);
                          // Also warm the next couple of images in this section
                          // so opening the lightbox here is instant.
                          prefetchImages(filtered.slice(i, i + 3).map((x) => x.src));
                        }}
                        onFocus={() => prefetchImage(g.src)}
                        tabIndex={0}
                        className="relative aspect-[4/3] rounded-xl overflow-hidden group cursor-zoom-in"
                      >
                        <ProgressiveImage src={g.src} alt={g.label ?? ROOM_META[g.room].label} width={700} height={525} widths={[320,480,700,1000]} sizes="(min-width:768px) 33vw, 50vw" containerClassName="absolute inset-0" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <figcaption className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wider text-white bg-noir-deep/70 px-2 py-1 rounded">
                          {ROOM_META[g.room].label}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </>
              )}
              {mediaTab === "video" && (
                <div className="mt-5">
                  {p.videoUrl ? (
                    <VideoPlayer url={p.videoUrl} title={p.title} />
                  ) : (
                    <MediaEmpty icon={<Play className="w-5 h-5" />} title="Video walkthrough coming soon" hint="The agent hasn’t uploaded a video tour for this property yet." />
                  )}
                </div>
              )}
              {mediaTab === "tour" && (
                <div className="mt-5">
                  {p.tourUrl ? (
                    <div className="aspect-video rounded-xl overflow-hidden bg-noir">
                      <iframe src={p.tourUrl} className="w-full h-full" allowFullScreen title="3D tour" />
                    </div>
                  ) : (
                    <MediaEmpty icon={<Box className="w-5 h-5" />} title="3D tour coming soon" hint="A virtual walkthrough will be published here once it’s ready." />
                  )}
                </div>
              )}
              {mediaTab === "floorplan" && (
                <div className="mt-5 rounded-xl border border-border bg-card p-6">
                  {p.floorPlanUrl ? (
                    <>
                      <iframe src={p.floorPlanUrl} className="w-full h-[600px] rounded" title="Floor plan" />
                      <a href={p.floorPlanUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-gold">
                        <Download className="w-4 h-4" /> Download PDF
                      </a>
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground text-sm">Floor plan coming soon.</div>
                  )}
                </div>
              )}
            </Section>

            {(p as any).apartments?.length > 0 && (
              <Section title="Available Units">
                <p className="text-sm text-muted-foreground mb-4">Select the exact apartment, office or studio you want. Only currently available units are shown.</p>
                <div className="grid sm:grid-cols-2 gap-4">{(p as any).apartments.map((a:any)=>{let unitImgs:any[]=[];try{unitImgs=typeof a.images_json==='string'?JSON.parse(a.images_json):a.images_json||[]}catch{};const unitCover=unitImgs?.find((x:any)=>x.is_cover)?.url||unitImgs?.[0]?.url;return <div key={a.id} className="rounded-2xl border border-border overflow-hidden bg-card"><div className="aspect-[16/9] bg-muted overflow-hidden">{unitCover?<img src={unitCover} alt={`${a.code} at ${p.title}`} className="w-full h-full object-cover"/>:<div className="h-full grid place-items-center text-sm text-muted-foreground">Apartment images coming soon — schedule a visit</div>}</div><div className="p-4"><div className="flex justify-between gap-3"><div><b>{a.name||a.code}</b><div className="text-xs text-muted-foreground">{String(a.unit_type||'apartment').toUpperCase()} {a.code}{a.floor!=null?` · Floor ${a.floor}`:''} · inside ${p.title}</div></div><span className="text-[11px] text-emerald-700">AVAILABLE</span></div><div className="mt-2 text-sm">{a.bedrooms??'—'} beds · {a.bathrooms??'—'} baths{a.area_sqm?` · ${a.area_sqm} sqm`:''}</div><div className="mt-2 font-semibold">{p.currency} {Number(a.monthly_price||p.price||0).toLocaleString()} / month</div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>{if(!user||!roles.includes("customer")){try{localStorage.setItem("nw_post_auth_redirect",`/properties/${p.slug}`);localStorage.setItem("nw_open_booking_after_auth",p.slug);localStorage.setItem("nw_booking_apartment_id",a.id);if(user&&!roles.includes("customer"))localStorage.removeItem("novaworks_session")}catch{}window.location.href="/auth";return;}setBookingApartmentId(a.id);setBookingOpen(true)}} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-noir-deep"><CalendarCheck className="h-4 w-4"/>Book {a.code}</button><button type="button" onClick={()=>{setVisitApartmentId(a.id);setTimeout(()=>document.getElementById("visit")?.scrollIntoView({behavior:"smooth",block:"center"}),20)}} className="inline-flex items-center rounded-lg border px-4 py-2 text-sm">Schedule visit</button></div></div></div>})}</div>
              </Section>
            )}

            {/* About */}
            <Section title="About This Property">
              <p className="text-muted-foreground leading-relaxed">{p.description}</p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                This residence has been curated by NOVAWORKS for clients who value discretion, design integrity, and locations that hold long-term value.
              </p>
            </Section>

            {/* Property Details */}
            <Section title="Property Details">
              <div className="grid md:grid-cols-2 gap-x-10 gap-y-1">
                <DetailRow label="Property ID" value={p.reference} />
                <DetailRow label="Category" value={CATEGORY_META[p.category].label} />
                {p.furnishing && <DetailRow label="Furnishing" value={p.furnishing} />}
                {p.yearBuilt && <DetailRow label="Year Built" value={p.yearBuilt} />}
                {p.floor != null && <DetailRow label="Floor" value={p.floor} />}
                {p.facing && <DetailRow label="Facing" value={p.facing} />}
                <DetailRow label="Total Area" value={`${p.area} Sqm`} />
                <DetailRow label="Listing" value={`For ${p.listing === "rent" ? "Rent" : "Sale"}`} />
              </div>
            </Section>

            {/* Amenities */}
            {p.amenities && p.amenities.length > 0 && (
              <Section title="Amenities & Features">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {p.amenities.map((a) => (
                    <div key={a} className="flex items-center gap-3 bg-card border border-border p-3 rounded-lg">
                      <span className="w-7 h-7 rounded-md bg-gold/15 text-gold flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </span>
                      <span className="text-sm">{a}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Neighborhood */}
            {p.neighborhood && p.neighborhood.length > 0 && (
              <Section title="Neighborhood">
                <div className="grid md:grid-cols-2 gap-3">
                  {p.neighborhood.map((n) => <NeighborCard key={n.name} place={n} />)}
                </div>
              </Section>
            )}

            {/* Location map */}
            <Section title="Location">
              <div className="rounded-2xl overflow-hidden border border-border bg-card">
                <div className="aspect-[16/9] relative">
                  <iframe
                    title="Map"
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${p.lng! - 0.01}%2C${p.lat! - 0.01}%2C${p.lng! + 0.01}%2C${p.lat! + 0.01}&layer=mapnik&marker=${p.lat}%2C${p.lng}`}
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gold" />
                    <div>
                      <div className="font-medium">{p.address}</div>
                      <div className="text-xs text-muted-foreground">{p.location}, {p.district}, Kigali</div>{p.lat!=null&&p.lng!=null&&<div className="text-[11px] text-gold mt-1">Coordinates: {Number(p.lat).toFixed(6)}, {Number(p.lng).toFixed(6)}</div>}
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm bg-noir-deep text-white px-4 py-2 rounded-md hover:bg-noir"
                  >
                    <ExternalLink className="w-4 h-4" /> Open in Google Maps
                  </a>
                </div>
              </div>
            </Section>

            {p.luxury && (
              <div className="flex items-start gap-3 bg-gold/10 border border-gold/30 rounded-xl p-4 text-sm">
                <Lock className="w-4 h-4 text-gold mt-0.5" />
                <div className="flex-1">
                  <div className="text-foreground font-medium">Exclusive Luxury Listing</div>
                  <div className="text-muted-foreground">Full media & pricing require verified-member access.</div>
                </div>
                <Link to="/verify-access" search={{ slug: p.slug }} className="text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-gold-soft to-gold text-noir-deep px-4 py-2 rounded-md">
                  Request Access
                </Link>
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="space-y-5 lg:sticky lg:top-28 self-start">
            {p.agent && <AgentCard agent={p.agent} />}
            <ScheduleVisitCard propertyId={p.id} apartments={(p as any).apartments||[]} initialApartmentId={visitApartmentId} />
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <button className="inline-flex items-center gap-1.5 hover:text-gold"><Download className="w-3.5 h-3.5" /> Brochure</button>
              <button className="inline-flex items-center gap-1.5 hover:text-gold"><Bell className="w-3.5 h-3.5" /> Alerts</button>
              <button className="inline-flex items-center gap-1.5 hover:text-gold"><Printer className="w-3.5 h-3.5" /> Print</button>
            </div>
          </aside>
        </div>
      </section>

      {related.length > 0 && (
        <section className="py-16 bg-muted/40">
          <div className="container-luxe">
            <h2 className="font-display text-3xl mb-8">Similar Properties</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((r) => <PropertyCard key={r.id} property={r} />)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 text-center">
      <div className="w-10 h-10 mx-auto rounded-md bg-gold/10 text-gold flex items-center justify-center">{icon}</div>
      <div className="mt-2 font-display text-2xl text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function RoomChip({ active, onClick, onMouseEnter, onFocus, children }: { active: boolean; onClick: () => void; onMouseEnter?: () => void; onFocus?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-gold text-noir-deep border-gold"
          : "border-border text-muted-foreground hover:text-foreground hover:border-gold/50"
      }`}
    >
      {children}
    </button>
  );
}

function MediaTab({ active, disabled, onClick, icon, label }: { active: boolean; disabled?: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-lg transition-colors ${
        active
          ? "bg-gradient-to-r from-gold-soft to-gold text-noir-deep shadow"
          : disabled
            ? "text-muted-foreground/50 cursor-not-allowed"
            : "text-foreground hover:bg-background"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function MediaEmpty({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/60 p-10 text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-gold/10 text-gold flex items-center justify-center">{icon}</div>
      <div className="mt-3 font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{hint}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <h2 className="font-display text-2xl">{title}</h2>
        <span className="h-px flex-1 bg-gradient-to-r from-gold/60 to-transparent" />
      </div>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-border py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function Pill({ icon, className = "", children }: { icon?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md ${className}`}>
      {icon} {children}
    </span>
  );
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="w-9 h-9 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-gold/50">
      {children}
    </button>
  );
}

const PLACE_ICON: Record<NeighborhoodPlace["type"], React.ReactNode> = {
  shopping: <ShoppingBag className="w-4 h-4" />,
  dining: <Utensils className="w-4 h-4" />,
  hospital: <Hospital className="w-4 h-4" />,
  school: <School className="w-4 h-4" />,
  transit: <Train className="w-4 h-4" />,
  park: <Trees className="w-4 h-4" />,
  landmark: <Landmark className="w-4 h-4" />,
};

function NeighborCard({ place }: { place: NeighborhoodPlace }) {
  return (
    <div className="flex items-start gap-3 bg-card border border-border rounded-xl p-4">
      <div className="w-10 h-10 rounded-lg bg-gold/15 text-gold flex items-center justify-center shrink-0">
        {PLACE_ICON[place.type]}
      </div>
      <div className="min-w-0">
        <div className="font-medium text-sm">{place.name}</div>
        <div className="text-xs text-gold mt-0.5">{place.distance}</div>
        {place.note && <div className="text-xs text-muted-foreground mt-0.5">{place.note}</div>}
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: NonNullable<Property["agent"]> }) {
  return (
    <div id="visit" className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <ProgressiveImage src={agent.avatar} alt={agent.name} width={112} height={112} widths={[112,224]} sizes="56px" containerClassName="w-14 h-14 rounded-full" className="w-full h-full rounded-full object-cover" />
        <div>
          <div className="font-medium">{agent.name}</div>
          <div className="text-xs text-muted-foreground">{agent.title}</div>
          {agent.rating && (
            <div className="flex items-center gap-1 mt-0.5 text-xs">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < Math.round(agent.rating!) ? "fill-gold text-gold" : "text-muted-foreground/40"}`} />
              ))}
              <span className="text-muted-foreground ml-1">({agent.reviews} reviews)</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-5 grid gap-2">
        <a href={`tel:${agent.phone}`} className="flex items-center justify-center gap-2 bg-gradient-to-r from-gold-soft to-gold text-noir-deep px-4 py-2.5 rounded-md text-sm font-medium">
          <Phone className="w-4 h-4" /> Call Now
        </a>
        {agent.whatsapp && (
          <a href={`https://wa.me/${agent.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-md text-sm font-medium hover:border-gold/60">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        )}
        <a href={`mailto:${agent.email}`} className="flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-md text-sm font-medium hover:border-gold/60">
          <Mail className="w-4 h-4" /> Send Email
        </a>
      </div>
    </div>
  );
}

function ScheduleVisitCard({ propertyId, apartments=[], initialApartmentId=null }: { propertyId: string; apartments?: any[]; initialApartmentId?: string|null }) {
  const createVisit = useServerFn(createVisitRequest);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", date: "", time: "10:00", notes: "", apartment_id: "" });
  useEffect(()=>{if(initialApartmentId)setForm(f=>({...f,apartment_id:initialApartmentId}))},[initialApartmentId]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await createVisit({ data: { property_id: propertyId, apartment_id: form.apartment_id || undefined, name: form.name, email: form.email, phone: form.phone, requested_for: `${form.date}T${form.time}:00`, notes: form.notes } });
      setSent(true);
    } catch (err: any) { setError(err?.message ?? "Could not request visit"); }
    finally { setBusy(false); }
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <h3 className="font-display text-xl mb-4">Schedule a Visit</h3>
      {sent ? <div className="text-sm text-muted-foreground py-6 text-center"><Check className="w-6 h-6 text-gold mx-auto"/><div className="mt-2">Request sent — our team has been notified and will confirm your viewing.</div></div> :
      <form onSubmit={submit} className="space-y-3">
        <Field label="Full Name"><input required className="input-luxe" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/></Field>
        <Field label="Email"><input required type="email" className="input-luxe" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="your@email.com"/></Field>
        <Field label="Phone Number"><input required className="input-luxe" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+250 7XX XXX XXX"/></Field>{apartments.length>0&&<Field label="Specific unit (optional)"><select className="input-luxe" value={form.apartment_id} onChange={e=>setForm({...form,apartment_id:e.target.value})}><option value="">General property / building visit</option>{apartments.map((a:any)=><option key={a.id} value={a.id}>{a.code}{a.name?` — ${a.name}`:""}</option>)}</select></Field>}
        <div className="grid grid-cols-2 gap-2"><Field label="Preferred Date"><input required type="date" className="input-luxe" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field><Field label="Time"><input required type="time" className="input-luxe" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></Field></div>
        <Field label="Message (Optional)"><textarea rows={3} className="input-luxe" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Tell us about your requirements…"/></Field>
        {error&&<p className="text-xs text-rose-600">{error}</p>}
        <button disabled={busy} className="w-full bg-gradient-to-r from-gold-soft to-gold text-noir-deep font-medium py-2.5 rounded-md disabled:opacity-60">{busy?"Sending…":"Request Visit"}</button>
      </form>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}