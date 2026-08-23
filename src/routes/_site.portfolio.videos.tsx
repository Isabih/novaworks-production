import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Play, Film, Search, ArrowLeft } from "lucide-react";
import { getPortfolioVideos, type PortfolioVideo } from "@/lib/portfolio-videos.functions";
import { VideoPlayer, getYouTubeId } from "@/components/site/VideoPlayer";

export const Route = createFileRoute("/_site/portfolio/videos")({
  head: () => ({
    meta: [
      { title: "Building Videos — NOVAWORKS Portfolio" },
      { name: "description", content: "Watch curated walkthrough videos of buildings and properties showcased by NOVAWORKS." },
    ],
  }),
  loader: () => getPortfolioVideos(),
  component: VideosPage,
});

function thumbFor(v: PortfolioVideo): string {
  if (v.poster) return v.poster;
  const yt = getYouTubeId(v.url);
  if (yt) return `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
  return "";
}

function VideosPage() {
  const videos = Route.useLoaderData() as PortfolioVideo[];
  const [activeId, setActiveId] = useState<string | null>(videos[0]?.id ?? null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return videos;
    return videos.filter(
      (v) =>
        v.title.toLowerCase().includes(s) ||
        v.building.toLowerCase().includes(s) ||
        (v.description ?? "").toLowerCase().includes(s),
    );
  }, [videos, q]);

  const active = videos.find((v) => v.id === activeId) ?? filtered[0] ?? null;

  return (
    <div>
      <section className="bg-noir-deep text-white py-16">
        <div className="container-luxe">
          <Link to="/portfolio" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-gold">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to portfolio
          </Link>
          <div className="mt-4 text-xs uppercase tracking-[0.2em] text-gold">Portfolio · Videos</div>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">Building walkthroughs.</h1>
          <p className="mt-3 text-white/60 max-w-2xl">
            Step inside our portfolio. Pick any building below to watch the cinematic walkthrough.
          </p>
        </div>
      </section>

      <section className="py-14 bg-gradient-to-b from-background to-muted/30">
        <div className="container-luxe">
          {videos.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-noir/15 rounded-2xl">
              <Film className="w-10 h-10 mx-auto text-noir/30" />
              <div className="mt-3 font-display text-2xl">No videos yet</div>
              <p className="mt-2 text-sm text-noir/60">Building walkthroughs will appear here soon.</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_360px] gap-8">
              {/* Main player */}
              <div className="space-y-4">
                {active && (
                  <>
                    <VideoPlayer url={active.url} title={active.title} poster={active.poster} />
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-gold">{active.building}</div>
                      <h2 className="mt-1 font-display text-2xl md:text-3xl text-foreground">{active.title}</h2>
                      {active.description && (
                        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{active.description}</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Playlist */}
              <aside className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-noir/40" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search buildings…"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-gold/30"
                  />
                </div>
                <div className="max-h-[640px] overflow-y-auto space-y-2 pr-1">
                  {filtered.map((v) => {
                    const thumb = thumbFor(v);
                    const isActive = active?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setActiveId(v.id)}
                        className={`group w-full flex gap-3 p-2 rounded-xl text-left transition-all ${
                          isActive ? "bg-gold/15 ring-1 ring-gold/50" : "bg-card hover:bg-muted border border-border"
                        }`}
                      >
                        <div className="relative w-28 aspect-video rounded-md overflow-hidden bg-noir-deep shrink-0">
                          {thumb ? (
                            <img src={thumb} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/30">
                              <Film className="w-5 h-5" />
                            </div>
                          )}
                          <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-gold/90 text-noir-deep grid place-items-center">
                              <Play className="w-4 h-4 ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 py-0.5">
                          <div className="text-[10px] uppercase tracking-wider text-gold truncate">{v.building}</div>
                          <div className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{v.title}</div>
                        </div>
                      </button>
                    );
                  })}
                  {filtered.length === 0 && (
                    <div className="text-center py-8 text-sm text-noir/50">No matches.</div>
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}