# NOVAWORKS business workflow update

- Property Types public API fixed; enabled/homepage types are now usable by the UI.
- Login supports an optional direct MP4/WebM background video with image fallback.
- Property lightbox retries original R2 image if a Cloudflare resized variant fails.
- Property map displays stored coordinates.
- Visit confirmation emails show assigned staff name, phone and business email and use the branded NOVAWORKS template.
- All outbound emails use `RESEND_REPLY_TO` (recommended: `info@novaworks.rw`).
- Booking notifications are created for IT/Admin/Reception and receptionist can send recorded email replies.
- VIP booking option requires approved Luxury Access; cash/VIP are confirmed manually by Reception. MoMo/Card use the existing Flutterwave gateway and still require Reception final confirmation.
- New Messages workspace stores/replies to booking/email conversations; messages are automatically removed after 7 days.
- Incoming email is received at `/api/mail/inbound`. Configure Resend `email.received` to this URL and set `RESEND_WEBHOOK_SECRET=whsec_...`; the route verifies the Resend/Svix signature before storing mail.
- Audit Logs and Notifications interfaces were rebuilt with clearer visual hierarchy.

## Database
Run `mysql/migrations/2026-08-22-business-workflow.sql` once on an existing database.

## External dependencies
Real MoMo/card payment requires `FLUTTERWAVE_SECRET_KEY` and Flutterwave merchant configuration. Incoming mail requires Resend Receiving/webhook configuration. These cannot be completed only from source code without provider account configuration.
