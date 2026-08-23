import { X } from "lucide-react";
import { useEffect } from "react";

function toYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace(/^\//, "");
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return `${url}${url.includes("?") ? "&" : "?"}autoplay=1&rel=0`;
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.replace(/^\//, "");
      return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : null;
    }
  } catch {}
  return null;
}

export function WatchStoryModal({ open, onClose, src }: { open: boolean; onClose: () => void; src: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const embed = toYouTubeEmbed(src);
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-nova-fade-up">
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-5 right-5 text-white/80 hover:text-gold p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
      {embed ? (
        <iframe
          src={embed}
          title="Story"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="w-full max-w-6xl aspect-video"
        />
      ) : (
        <video autoPlay controls playsInline className="w-full h-full max-w-6xl max-h-[90vh] object-contain" src={src} />
      )}
    </div>
  );
}