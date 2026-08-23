import { useMemo, useState } from "react";
import { cfImage, cfImageSrcSet, type CfImageOpts } from "@/lib/cf-image";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> & {
  src: string;
  alt: string;
  containerClassName?: string;
  /** Intrinsic dimensions — used for CLS prevention AND as the default resize width. */
  width?: number;
  height?: number;
  /** Set to true for above-the-fold LCP images (eager + fetchPriority=high). */
  priority?: boolean;
  /** Widths for srcset. Defaults to a sensible ladder around `width`. */
  widths?: number[];
  /** <img sizes> attribute. Required for srcset to work. */
  sizes?: string;
  /** Image quality (1-100). Default 70 for fast high-quality web delivery. */
  quality?: number;
  /** Fit mode for the Cloudflare resize. Default "cover". */
  fit?: CfImageOpts["fit"];
};

function defaultLadder(w?: number): number[] {
  const base = [320, 480, 640, 800, 1200, 1600, 2000];
  if (!w) return base;
  // Keep enough candidates around the rendered size for DPR screens without
  // forcing phones to download desktop-sized files.
  const wanted = base.filter((n) => n <= Math.max(800, w * 2));
  wanted.push(Math.min(2000, Math.max(320, Math.round(w))));
  return Array.from(new Set(wanted)).sort((a, b) => a - b);
}

/**
 * Lightweight image with skeleton + fade-in.
 * Uses native lazy-loading and async decoding so the browser's
 * image preloader, HTTP cache, and progressive decoding all work.
 */
export function ProgressiveImage({
  src,
  alt,
  className = "",
  containerClassName = "",
  priority = false,
  loading,
  width,
  height,
  widths,
  sizes,
  quality = 70,
  fit = "cover",
  ...rest
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [fallback, setFallback] = useState(false);

  const ladder = useMemo(() => widths ?? defaultLadder(width), [widths, width]);
  const opts: CfImageOpts = { quality, fit, format: "auto", height };
  const resolvedSrc = fallback ? src : cfImage(src, { ...opts, width: width ?? ladder[ladder.length - 1] });
  const srcSet = fallback ? undefined : cfImageSrcSet(src, ladder, opts) || undefined;

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {!loaded && !errored && (
        <div className="absolute inset-0 bg-noir/[.035]" aria-hidden />
      )}
      {errored && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-white/70 bg-noir-deep/60 z-10">
          Image unavailable
        </div>
      )}
      <img
        ref={(el) => {
          // Images restored from cache / SSR markup can already be complete
          // before React attaches onLoad — otherwise they'd stay at opacity-0.
          if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
        }}
        src={resolvedSrc}
        srcSet={srcSet}
        sizes={sizes}
        width={width}
        height={height}
        alt={alt}
        loading={loading ?? (priority ? "eager" : "lazy")}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        onError={() => {
          // If the CF-resized URL failed (zone without Image Resizing, etc.),
          // retry once with the original src before giving up.
          if (!fallback && resolvedSrc !== src) {
            setFallback(true);
          } else {
            setErrored(true);
          }
        }}
        className={`${className} ${loaded ? "animate-img-fade-in" : "opacity-100"}`}
        {...rest}
      />
    </div>
  );
}