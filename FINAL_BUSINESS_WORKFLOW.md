# NOVAWORKS business workflow update

This build unifies the final media, booking, notification and communication workflows.

## Included

- Stable database-backed Property Types editor with separate `Enabled` and `Homepage` switches.
- Public homepage shows only property types selected for homepage display.
- Portfolio video navigation and YouTube/Vimeo/direct-video playback.
- Sign-in image/video background with subtle motion and image fallback.
- Clear-view property lightbox uses the optimized original R2 object, avoiding broken Cloudflare transform thumbnails.
- Property coordinates are displayed under the public map and used for Google Maps.
- Branded NOVAWORKS emails with black header, gold accent, contact email and phone.
- Visit confirmation emails contain the assigned staff member's real name, email and phone when available.
- Rich new-property publication emails with image, price, type, listing and location details.
- Booking queue for Reception/Admin/IT with MoMo/card/cash/VIP logic.
- Cash and VIP stays are not created until Reception confirms.
- Online MoMo/card bookings require successful gateway verification before Reception can confirm.
- Booking approval/decline/reply messages are emailed and recorded in the Messages workspace.
- Mail workspace for IT/Admin/Receptionist, plus booking conversations for customers.
- Communication messages are retained for seven days by the app cleanup routine.
- Resend inbound email endpoint creates mail threads and staff notifications.
- Operational notification bell/count and role filtering.
- Audit log timeline interface.

## External services still require valid credentials/configuration

- Resend sending + Receiving webhook/MX configuration.
- Flutterwave credentials for real MoMo/card transactions.
- OpenAI credits or Ollama fallback for NOVA AI.
- Cloudflare R2 CORS must include the actual development/production browser origins.

## Database upgrade

For an older NOVAWORKS database, run once:

```bash
mysql -u novaworks -p novaworks < mysql/migrations/2026-08-22-business-workflow.sql
```

Fresh installs already receive the same tables/columns from `mysql/schema.sql`.

## NOVA availability

NOVA first uses OpenAI. If OpenAI returns a quota/rate-limit response and Ollama is not configured, NOVA automatically falls back to a database-safe basic mode for live stays, payments, service requests, visits, extensions, owner balances and staff operational counts instead of displaying an unavailable error.
