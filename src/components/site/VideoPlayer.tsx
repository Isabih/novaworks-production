import { Play, Film } from "lucide-react";

/**
 * Parses a YouTube URL (watch, short, embed, youtu.be) and returns the video id, or null.
 */
export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.slice(1) || null;
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(embed|shorts|v|live)\/([^/?#]+)/);
      if (m) return m[2];
    }
  } catch {
    // not a url — try raw id
    if (/^[A-Za-z0-9_-]{6,}$/.test(url)) return url;
  }
  return null;
}

export function toYouTubeEmbed(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` : null;
}

export function getVimeoId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const match = u.pathname.match(/(?:video\/)?(\d+)/);
      return match?.[1] ?? null;
    }
  } catch {}
  return null;
}

export function toVimeoEmbed(url: string): string | null {
  const id = getVimeoId(url);
  return id ? `https://player.vimeo.com/video/${id}` : null;
}

/**
 * Professional video frame for property pages.
 * - YouTube/Vimeo: embeds in a polished bezel
 * - direct .mp4/.webm: native <video> player with controls
 */
export function VideoPlayer({ url, title = "Property video", poster }: { url: string; title?: string; poster?: string }) {
  const yt = toYouTubeEmbed(url);
  const vimeo = toVimeoEmbed(url);
  const isDirect = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
  const kind = yt ? "YouTube" : vimeo ? "Vimeo" : isDirect ? "HD Video" : "Embed";

  return (
    <figure
      className="group relative rounded-3xl overflow-hidden bg-gradient-to-b from-noir-deep to-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
      aria-label={title}
    >
      {/* gold ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--gold, #c9a24a) 18%, transparent), transparent 70%)" }}
      />

      {/* top chrome */}
      <div className="relative flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-black/40 backdrop-blur">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/50">
          <Film className="h-3 w-3 text-gold" aria-hidden />
          {kind}
        </span>
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/30">Novaworks</span>
      </div>

      <div className="relative aspect-video bg-black">
        {yt || vimeo ? (
          <iframe
            src={yt || vimeo || ""}
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : isDirect ? (
          <video
            src={url}
            poster={poster}
            controls
            playsInline
            preload="metadata"
            aria-label={title}
            className="absolute inset-0 w-full h-full object-cover"
          >
            Your browser doesn't support embedded video.
          </video>
        ) : (
          <iframe
            src={url}
            title={title}
            loading="lazy"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        )}
        {/* cinematic vignette */}
        <div aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/5 rounded-none" />
      </div>

      <figcaption className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-noir-deep via-black to-noir-deep text-white/80 text-xs">
        <span className="inline-flex items-center gap-2.5 min-w-0">
          <span className="h-7 w-7 shrink-0 rounded-full bg-gold/15 text-gold flex items-center justify-center ring-1 ring-gold/30">
            <Play className="h-3 w-3 fill-current" aria-hidden />
          </span>
          <span className="truncate font-medium text-white/90">{title}</span>
        </span>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-white/40">
          <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" aria-hidden />
          Live preview
        </span>
      </figcaption>
    </figure>
  );
}
