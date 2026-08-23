# NOVAWORKS image performance

This build normalizes uploaded images before Cloudflare R2 storage and serves public R2 images through responsive Cloudflare `/cdn-cgi/image/` variants.

## Required environment values

```env
R2_PUBLIC_BASE_URL=https://assets.novaworks.rw
VITE_CF_IMAGE_HOSTS=assets.novaworks.rw
```

Restart Vite after changing `VITE_CF_IMAGE_HOSTS`.

## What the application now does

- Large image uploads are resized to a practical web master size and converted to WebP when that makes the file smaller.
- The original aspect ratio is preserved during upload optimization.
- Property cards, galleries, homepage content, portfolio and lightbox thumbnails request only the pixel width needed by the device.
- Cloudflare selects a modern output format automatically.
- Off-screen images use native lazy loading and async decoding.
- Above-the-fold/LCP images use eager loading and high fetch priority.
- Fixed aspect-ratio containers prevent layout jumping while images load.
- Lightbox prefetching warms optimized 1800px variants instead of downloading full originals.
- The page preconnects to `assets.novaworks.rw`.
- Property creation no longer has a fixed image-count limit. Individual files remain size/type validated.

## Cloudflare

Ensure Image Resizing is enabled for the zone serving `assets.novaworks.rw`. The application automatically falls back to the original URL if a transformed URL cannot be loaded.

Because uploaded object names use UUIDs, long CDN cache lifetimes are safe. A Cloudflare cache rule for the assets hostname can be used to increase edge/browser cache lifetime for public media.
