/**
 * Cloudflare Image Resizing helper.
 *
 * Rewrites image URLs to use Cloudflare's `/cdn-cgi/image/` transform
 * endpoint so the browser receives a resized/recompressed/format-converted
 * variant instead of the original.
 *
 * Only URLs whose hostname is in `VITE_CF_IMAGE_HOSTS` (comma-separated, or
 * `*` for all) are rewritten. Image Resizing must be enabled on that
 * Cloudflare zone, otherwise the transform path returns the original.
 *
 * Example:
 *   VITE_CF_IMAGE_HOSTS=cdn.novaworks.rw,img.novaworks.rw
 *
 *   cfImage("https://cdn.novaworks.rw/properties/a.jpg", { width: 800 })
 *   → "https://cdn.novaworks.rw/cdn-cgi/image/width=800,quality=80,format=auto/properties/a.jpg"
 */

export type CfImageOpts = {
  width?: number;
  height?: number;
  quality?: number;
  format?: "auto" | "webp" | "avif" | "json";
  fit?: "cover" | "contain" | "scale-down" | "crop" | "pad";
  dpr?: number;
};

const HOSTS = (import.meta.env.VITE_CF_IMAGE_HOSTS as string | undefined) ?? "";
const ENABLED_HOSTS = new Set(
  HOSTS.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean),
);
const ALL = ENABLED_HOSTS.has("*");

function shouldRewrite(host: string): boolean {
  return ALL || ENABLED_HOSTS.has(host.toLowerCase());
}

function buildOpts(opts: CfImageOpts): string {
  const parts: string[] = [];
  if (opts.width) parts.push(`width=${Math.round(opts.width)}`);
  if (opts.height) parts.push(`height=${Math.round(opts.height)}`);
  parts.push(`quality=${opts.quality ?? 80}`);
  parts.push(`format=${opts.format ?? "auto"}`);
  if (opts.fit) parts.push(`fit=${opts.fit}`);
  if (opts.dpr) parts.push(`dpr=${opts.dpr}`);
  return parts.join(",");
}

/**
 * Rewrite a single URL to its Cloudflare-resized variant.
 * Returns the original URL unchanged when:
 *  - it is not absolute http(s)
 *  - its host is not in VITE_CF_IMAGE_HOSTS
 *  - it is already a /cdn-cgi/image/ URL
 */
export function cfImage(src: string, opts: CfImageOpts = {}): string {
  if (!src || typeof src !== "string") return src;
  if (!/^https?:\/\//i.test(src)) return src;
  let u: URL;
  try {
    u = new URL(src);
  } catch {
    return src;
  }
  if (u.pathname.startsWith("/cdn-cgi/image/")) return src;
  if (!shouldRewrite(u.hostname)) return src;
  const optsStr = buildOpts(opts);
  const rest = u.pathname.replace(/^\/+/, "") + (u.search || "");
  return `${u.origin}/cdn-cgi/image/${optsStr}/${rest}`;
}

/**
 * Build a srcset string for the given widths.
 * Returns "" when the URL can't be rewritten (so callers can skip srcset).
 */
export function cfImageSrcSet(
  src: string,
  widths: number[],
  opts: CfImageOpts = {},
): string {
  if (!src) return "";
  try {
    const u = new URL(src);
    if (!shouldRewrite(u.hostname)) return "";
  } catch {
    return "";
  }
  return widths
    .map((w) => `${cfImage(src, { ...opts, width: w })} ${w}w`)
    .join(", ");
}