# NOVAWORKS experience and diagnostics — review notes

## UI
- Authentication form uses an opaque navy surface and dark overlays so both bright and dark wallpapers retain readable text and controls.
- Sign-in includes a subtle "Refined experience" version indicator.
- Guided tour has cinematic dark framing, larger stage, elevated motion and revised copy; no additional large video downloads.

## Images
- ProgressiveImage now defaults to quality 64 and smaller mobile srcset candidates. Offscreen images use low fetch priority. Cloudflare resizing is **only effective** if VITE_CF_IMAGE_HOSTS is configured and Image Resizing is enabled on those hosts.
- Benchmark actual LCP, transfer size and Core Web Vitals before claiming a measured speedup. Do not set every image to eager/high priority.

## NOVA AI
- Previous default model names were nonstandard deployment identifiers (gpt-5.6-luna and gpt-5.4-mini), likely producing model-not-found errors. Defaults now use gpt-4.1-mini and gpt-4o-mini; OPENAI_MODEL and OPENAI_FALLBACK_MODEL can override these based on account access.
- Chat context queries can fail if a deployed database schema is behind migrations; the endpoint now falls back to limited public-safe context rather than aborting the whole chat.
- External calls have timeouts and input bounds; fallback basic mode is intentionally not generative AI.
- Configure OPENAI_API_KEY, validate API account access/billing and inspect server-side [NOVA AI] logs. No production API key was available to verify real responses.
- Removed hardcoded, unverified phone and email addresses from the escalation panel.

## Audit
- IT can filter recorded audit events by actor user ID and paginate older events.
- Secrets and password-like fields are redacted from audit display.
- **Important:** This does not yet capture every read, view, login, download or uninstrumented mutation. Achieving full per-user activity requires consistent server-side event instrumentation, retention policy, IP/device metadata safeguards and appropriate privacy review.

## Validation
The branch remains a draft PR. Existing TypeScript errors are tracked separately. Run CI and browser checks before release.
