# NOVAWORKS final runtime fix — 2026-08-23

Run this once on an existing MySQL database:

```bash
mysql -u novaworks -p novaworks < mysql/migrations/2026-08-23-final-runtime-fix.sql
```

This migration is compatible with Oracle MySQL 8.x and avoids unsupported `ADD COLUMN IF NOT EXISTS` syntax.
It repairs:
- `app_settings.auth_hero_image_url`
- `app_settings.auth_hero_video_url`
- `app_settings.property_categories`
- `app_settings.featured_property_ids`
- `communication_threads`
- `communication_messages`
- Resend provider metadata fields (`provider_email_id`, `provider_message_id`, `to_json`, `cc_json`, `attachments_json`)

The public Home Content loader now uses `SELECT *` so an older database cannot crash the homepage merely because a newly-added optional column is absent.
The sign-in image overlay is also lighter so the configured image is actually visible.
