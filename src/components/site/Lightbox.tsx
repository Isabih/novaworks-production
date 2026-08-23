import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { prefetchImages, isImageReady } from "@/lib/image-prefetch";

export interface LightboxImage {
  src: string;
  label?: string;
}

export function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const total = images.length;
  const go = useCallback(
    (delta: number) => onIndexChange((index + delta + total) % total),
    [index, total, onIndexChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [go, onClose]);

  // Prefetch neighbouring images so prev/next feels instant within the current set.
  // Uses the shared cache + concurrency-capped queue so reopening the same
  // section reuses already-decoded images and we never hammer the network.
  useEffect(() => {
    if (!images.length) return;
    const neighbours = [1, -1, 2, -2, 3, -3]
      .map((d) => images[(index + d + total) % total]?.src)
      .filter((src): src is string => !!src);
    prefetchImages(neighbours);
  }, [index, images, total]);

  const current = images[index];
  // Uploaded property media is already normalized before R2 upload. Use the original
  // public object in the clear-view lightbox so a missing Cloudflare Image Resizing
  // entitlement can never turn the gallery into broken thumbnails.
  const currentSrc = current?.src ?? "";
  const [loaded, setLoaded] = useState<boolean>(() => (currentSrc ? isImageReady(currentSrc) : false));
  useEffect(() => {
    setLoaded(currentSrc ? isImageReady(currentSrc) : false);
  }, [currentSrc]);

  if (!images.length || !current) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" role="dialog" aria-modal="true">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-8 py-4 text-white">
        <div className="text-sm">
          <span className="font-medium">{index + 1}</span>
          <span className="text-white/50"> / {total}</span>
          {current.label && <span className="ml-3 text-white/70">{current.label}</span>}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main image */}
      <div className="flex-1 relative flex items-center justify-center px-4">
        <button
          onClick={() => go(-1)}
          aria-label="Previous image"
          className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="relative max-h-full max-w-full flex items-center justify-center">
          {!loaded && (
            <div
              aria-hidden
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-[70vw] max-w-3xl aspect-[3/2] rounded-xl bg-white/5 animate-pulse" />
            </div>
          )}
          <img
            key={current.src}
            src={currentSrc}
            alt={current.label ?? `Image ${index + 1}`}
            onLoad={() => setLoaded(true)}
            onError={(e) => { const el=e.currentTarget; if(el.src !== current.src){ el.src=current.src; } }}
            className={`max-h-[80vh] max-w-full object-contain select-none transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
            draggable={false}
          />
        </div>
        <button
          onClick={() => go(1)}
          aria-label="Next image"
          className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Thumbnails */}
      <div className="p-4 overflow-x-auto">
        <div className="flex gap-2 justify-center min-w-max mx-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => onIndexChange(i)}
              className={`w-20 h-14 rounded-md overflow-hidden border-2 transition ${
                i === index ? "border-gold" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={img.src} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover transition-opacity duration-150" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}