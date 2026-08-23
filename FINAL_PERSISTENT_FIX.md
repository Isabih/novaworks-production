# NOVAWORKS persistent runtime fix — 2026-08-23

This build removes the recurring runtime dependencies that caused `/`, `/auth`, and `/dashboard/it/property-types` to fail on older MySQL schemas.

## Key changes

- Property Types now uses its own `property_types` table. The server function creates/seeds it automatically, so the page no longer depends on `app_settings.property_categories`.
- Public homepage loaders return safe fallback data if an optional table/column is missing instead of crashing the whole homepage.
- The login hero uses the direct public/R2 image URL. Cloudflare `/cdn-cgi/image/` rewriting is disabled unless `VITE_CF_IMAGE_HOSTS` is explicitly configured.
- IT Email Settings now includes a real SMS Hub sample sender. It shows the endpoint, HTTP status, and provider response/error.
- SMS secrets remain server-side in `.env`.
- `2026-08-23-core-runtime-safe.sql` is compatible with MySQL 8 and also adds missing communication provider metadata without `ADD COLUMN IF NOT EXISTS` syntax.
- No `inputValidator()` calls remain in `src`.
- `/api/features` uses the shared MySQL helper, not a missing `pool` export.

## Existing database

Run once:

```bash
mysql -u novaworks -p novaworks < mysql/migrations/2026-08-23-core-runtime-safe.sql
```

## Image delivery

For the most reliable current setup, do not set `VITE_CF_IMAGE_HOSTS` unless Cloudflare Image Resizing is enabled for the assets zone. The optimized originals uploaded to R2 are used directly.

## SMS

Required `.env`:

```env
SMS_API_BASE_URL=https://YOUR_SMS_HUB_DOMAIN
SMS_API_KEY=YOUR_API_KEY
SMS_DEFAULT_MODE=device
SMS_DEVICE_PATH=/api/public/v1/sms/device/send
SMS_RELAY_PATH=/api/public/v1/sms/relay/send
SMS_TIMEOUT_MS=15000
```

Use IT Dashboard -> Email Settings -> SMS Hub -> Send sample SMS.
