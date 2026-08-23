import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LayoutDashboard, Image as ImageIcon, Plus, Trash2, Save, Loader2, Star, Building2, Check } from "lucide-react";
import { DashboardShell, Panel } from "@/components/dashboard/DashboardShell";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { getHomeContent, updateHomeContent, type HeroSlide } from "@/lib/home-content.functions";
import { listPropertiesForPicker } from "@/lib/property-of-day.functions";
import { CATEGORY_META, type PropertyCategory } from "@/lib/properties";
import { toast } from "sonner";
import { MediaInput } from "@/components/dashboard/MediaInput";
import { VideoUrlInput, parseVideoUrl } from "@/components/dashboard/VideoUrlInput";

export const Route = createFileRoute("/_authenticated/dashboard/it/home-content")({
  head: () => ({ meta: [{ title: "Homepage Content — NOVAWORKS" }] }),
  component: () => (
    <RoleGate allow={["it"]} exclusive>
      <Page />
    </RoleGate>
  ),
});

const NAV = [
  { to: "/dashboard/it", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/dashboard/properties", label: "Properties", icon: Building2, group: "Content" },
  { to: "/dashboard/it/home-content", label: "Homepage Content", icon: ImageIcon, group: "Content" },
  { to: "/dashboard/it/property-of-the-day", label: "Property of the Day", icon: Star, group: "Content" },
];

function Page() {
  const load = useServerFn(getHomeContent);
  const save = useServerFn(updateHomeContent);
  const loadProps = useServerFn(listPropertiesForPicker);

  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [cats, setCats] = useState<Record<string, string>>({});
  const [video, setVideo] = useState("");
  const [bg, setBg] = useState("");
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [authHero, setAuthHero] = useState("");
  const [authVideo, setAuthVideo] = useState("");
  const [allProps, setAllProps] = useState<Array<{ id: string; title: string; city: string | null; district: string | null; cover: string | null; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([load(), loadProps().catch(() => [])])
      .then(([d, props]) => {
        setSlides(d.hero_slides);
        setCats(d.category_images);
        setVideo(d.hero_story_video_url);
        setBg(d.hero_video_bg_url ?? "");
        setFeaturedIds(d.featured_property_ids ?? []);
        setAuthHero(d.auth_hero_image_url ?? "");
        setAuthVideo(d.auth_hero_video_url ?? "");
        setAllProps((props as any[]) ?? []);
      })
      .finally(() => setLoading(false));
  }, [load, loadProps]);

  const updateSlide = (i: number, k: keyof HeroSlide, v: string) =>
    setSlides((s) => s.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));

  const addSlide = () =>
    setSlides((s) => [...s, { image: "", title: "New", titleAccent: "Slide", subtitle: "Edit this slide." }]);

  const removeSlide = (i: number) => setSlides((s) => s.filter((_, idx) => idx !== i));

  const onSave = async () => {
    if (video.trim() && parseVideoUrl(video).kind === null) {
      toast.error("Watch Story URL is not a supported video link");
      return;
    }
    if (authVideo.trim() && parseVideoUrl(authVideo).kind === null) { toast.error("Sign-in video URL is not supported"); return; }
    if (bg.trim() && parseVideoUrl(bg).kind === null) {
      toast.error("Hero background video URL is not supported");
      return;
    }
    // Strip slides without an image — they cause "invalid_format url" errors
    const cleanSlides = slides
      .map((s) => ({ ...s, image: s.image?.trim() ?? "" }))
      .filter((s) => s.image.length > 0);
    if (cleanSlides.length !== slides.length) {
      toast.info(`Skipped ${slides.length - cleanSlides.length} empty slide(s) without an image`);
    }
    setSaving(true);
    try {
      await save({ data: { hero_slides: cleanSlides, category_images: cats, hero_story_video_url: video, hero_video_bg_url: bg || "", featured_property_ids: featuredIds, auth_hero_image_url: authHero || "", auth_hero_video_url: authVideo || "" } });
      setSlides(cleanSlides);
      toast.success("Homepage content saved");
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Failed to save";
      try {
        const parsed = JSON.parse(msg);
        if (Array.isArray(parsed) && parsed[0]?.message) {
          toast.error(`${parsed[0].path?.join(".") ?? "field"}: ${parsed[0].message}`);
        } else {
          toast.error(msg);
        }
      } catch {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatured = (id: string) =>
    setFeaturedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <DashboardShell title="Homepage Content" subtitle="Manage hero images, category images and the Watch Story video" role="it" nav={NAV}>
      {loading ? (
        <div className="flex items-center gap-2 text-noir/60"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="space-y-6">
          <Panel title="Watch Story video" subtitle="Used as the hero background when visitors click 'Watch Story'. Supports YouTube or direct .mp4 URLs.">
            <VideoUrlInput value={video} onChange={setVideo} placeholder="https://www.youtube.com/watch?v=..." />
          </Panel>

          <Panel title="Hero background video (optional)" subtitle="If set, replaces the slideshow image with a looping muted video">
            <VideoUrlInput value={bg} onChange={setBg} placeholder="https://...mp4 (leave empty to use image slideshow)" />
          </Panel>

          <Panel title="Sign-in page" subtitle="Upload the background and preview the real sign-in composition while you edit.">
            <div className="grid lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
              <div>
                <MediaInput value={authHero} onChange={setAuthHero} subdir="auth" aspect="aspect-[4/5]" label="Auth hero image" previewClassName="max-w-[280px]" />
                <div className="mt-4"><div className="text-xs font-semibold text-noir/55 mb-1">Optional sign-in video</div><VideoUrlInput value={authVideo} onChange={setAuthVideo} placeholder="https://...mp4" /></div>
                <p className="mt-2 text-[11px] leading-relaxed text-noir/45">If a direct video is set it plays muted and looped; otherwise the optimized image is used.</p>
              </div>
              <AuthPagePreview image={authHero} video={authVideo} />
            </div>
          </Panel>

          <Panel title="Hero slideshow" subtitle="These rotate on the homepage hero. Upload to replace — you'll see a before / after preview before it saves.">
            <div className="space-y-5">
              {slides.map((s, i) => (
                <div key={i} className="rounded-xl border border-noir/10 bg-white overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-noir/10 bg-noir/[0.03]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-noir/70">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gold/20 text-gold-dark">{i + 1}</span>
                      Slide {i + 1}
                    </div>
                    <button
                      onClick={() => removeSlide(i)}
                      className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                      aria-label="Remove slide"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                  <div className="grid md:grid-cols-[minmax(0,360px)_1fr] gap-5 p-4">
                    <div>
                      <MediaInput
                        value={s.image}
                        onChange={(v) => updateSlide(i, "image", v)}
                        subdir="hero"
                        aspect="aspect-[16/10]"
                        label="Background image"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="grid sm:grid-cols-2 gap-2">
                        <label className="block">
                          <span className="text-[11px] uppercase tracking-wider text-noir/50">Title</span>
                          <input value={s.title} onChange={(e) => updateSlide(i, "title", e.target.value)} placeholder="Discover" className="mt-1 w-full bg-noir/5 rounded px-3 py-2 text-sm" />
                        </label>
                        <label className="block">
                          <span className="text-[11px] uppercase tracking-wider text-noir/50">Accent (gold)</span>
                          <input value={s.titleAccent} onChange={(e) => updateSlide(i, "titleAccent", e.target.value)} placeholder="Exceptional Living" className="mt-1 w-full bg-noir/5 rounded px-3 py-2 text-sm" />
                        </label>
                      </div>
                      <label className="block">
                        <span className="text-[11px] uppercase tracking-wider text-noir/50">Subtitle</span>
                        <textarea value={s.subtitle} onChange={(e) => updateSlide(i, "subtitle", e.target.value)} placeholder="One line that supports the headline." rows={2} className="mt-1 w-full bg-noir/5 rounded px-3 py-2 text-sm resize-none" />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addSlide} className="inline-flex items-center gap-2 text-sm font-medium text-gold hover:underline">
                <Plus className="w-4 h-4" /> Add slide
              </button>
            </div>
          </Panel>

          <Panel
            title="Hand-Picked Residences"
            subtitle={`Pick which registered properties show in 'Hand-Picked Residences' and the 'Building Rwanda' imagery. ${featuredIds.length} selected. Leave empty to auto-show the 6 newest.`}
          >
            {allProps.length === 0 ? (
              <div className="text-sm text-noir/60">No registered properties yet. Add one from Properties → New.</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allProps.map((p) => {
                  const selected = featuredIds.includes(p.id);
                  const order = featuredIds.indexOf(p.id);
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => toggleFeatured(p.id)}
                      className={`relative text-left rounded-lg overflow-hidden border bg-white transition ${
                        selected ? "border-gold ring-2 ring-gold/40" : "border-noir/10 hover:border-noir/30"
                      }`}
                    >
                      <div className="aspect-[4/3] bg-noir/5">
                        {p.cover ? (
                          <img src={p.cover} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-noir/30 text-xs">No image</div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="text-sm font-medium text-noir line-clamp-1">{p.title}</div>
                        <div className="text-xs text-noir/50">{[p.district, p.city].filter(Boolean).join(", ") || "—"}</div>
                      </div>
                      {selected && (
                        <div className="absolute top-2 right-2 inline-flex items-center gap-1 bg-gold text-noir-deep text-[10px] font-bold px-2 py-1 rounded-full">
                          <Check className="w-3 h-3" /> #{order + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title="Explore Property Types — images" subtitle="Image shown on each category tile (leave empty to use icon only)">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(CATEGORY_META) as PropertyCategory[]).map((cat) => (
                <div key={cat} className="p-3 rounded-lg border border-noir/10 bg-white">
                  <MediaInput
                    value={cats[cat] ?? ""}
                    onChange={(v) => setCats((c) => ({ ...c, [cat]: v }))}
                    subdir={`category/${cat}`}
                    aspect="aspect-[16/10]"
                    label={CATEGORY_META[cat].plural}
                  />
                </div>
              ))}
            </div>
          </Panel>

          <div className="sticky bottom-4 flex justify-end">
            <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 bg-gradient-to-r from-gold-soft to-gold text-noir-deep px-5 py-2.5 rounded-md font-medium shadow-lg disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save changes
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
function AuthPagePreview({ image, video }: { image: string; video: string }) {
  const parsed = parseVideoUrl(video || "");
  const media = (() => {
    if (parsed.kind === "mp4" || parsed.kind === "webm") return <video src={parsed.embed || video} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />;
    if ((parsed.kind === "youtube" || parsed.kind === "vimeo") && parsed.embed) {
      let src = parsed.embed;
      if (parsed.kind === "youtube") src += `${src.includes("?") ? "&" : "?"}autoplay=1&mute=1&controls=0&loop=1&playlist=${parsed.id || ""}&playsinline=1`;
      else src += `${src.includes("?") ? "&" : "?"}autoplay=1&muted=1&background=1&loop=1`;
      return <iframe src={src} title="Sign-in video preview" className="absolute -inset-[8%] h-[116%] w-[116%] pointer-events-none" allow="autoplay; fullscreen" />;
    }
    if (image) return <img src={image} className="absolute inset-0 h-full w-full object-cover" alt="Sign-in preview" />;
    return <div className="absolute inset-0 grid place-items-center text-xs text-white/35">Default image</div>;
  })();
  return <div className="rounded-2xl border border-noir/10 bg-[#f7f6f2] p-4 shadow-sm">
    <div className="mb-3 flex items-center justify-between"><div className="text-[11px] uppercase tracking-[.16em] text-noir/45">Live preview</div><div className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">Desktop</div></div>
    <div className="mx-auto grid max-w-[720px] overflow-hidden rounded-2xl border border-noir/10 bg-white shadow-xl md:grid-cols-[1.05fr_.95fr]">
      <div className="p-6 md:p-8"><div className="font-display text-lg">NOVAWORKS</div><div className="mt-10 max-w-[240px]"><div className="font-display text-2xl">Welcome back</div><div className="mt-2 text-[11px] text-noir/45">Sign in to access your account and manage your properties.</div><div className="mt-5 h-9 rounded-lg border border-noir/10 bg-noir/[.02]"/><div className="mt-3 h-9 rounded-lg border border-noir/10 bg-noir/[.02]"/><div className="mt-4 h-9 rounded-lg bg-gold"/></div></div>
      <div className="relative hidden min-h-[330px] md:block bg-noir-deep overflow-hidden">{media}<div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10"/><div className="absolute bottom-5 left-5 right-5 text-white"><div className="font-display text-lg italic">A refined way to manage property.</div><div className="mt-2 text-[10px] text-white/65">NOVAWORKS · Kigali, Rwanda</div></div></div>
    </div>
  </div>;
}
