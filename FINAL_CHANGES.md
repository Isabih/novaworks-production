# NOVAWORKS Final Integrated Build

This package combines the MySQL-only foundation with the latest interface and integration fixes.

## Included
- MySQL-only business data/authentication architecture.
- HIE/NIDA Basic Auth lookup with documentType=NID, documentNumber and NIDA_FOSAID (default 0023).
- Expanded citizen mapping: names, parents, sex, DOB, place of birth, nationality, civil status, Rwanda domicile hierarchy, UPI, FOSAID, service flag, raw response and optional photo.
- NIDA identity photo stays hidden until Reception chooses Show photo.
- Manual customer registration defaults to Rwanda and provides Province -> District -> Sector -> Cell -> Village cascading selectors from the supplied Rwanda public dataset URL, with a manual fallback.
- Pending registration stores identity/address details before email OTP confirmation; final customer creation carries them into customers.
- Returning verified customers can be selected and assigned a new stay without repeating verification.
- Email OTP before a new stay is committed.
- Five-minute user inactivity logout (activity resets the timer).
- Resend support through RESEND_API_KEY / RESEND_FROM_EMAIL.
- SMS Hub device/relay endpoints through configurable paths and Bearer API key.
- OpenAI NOVA via OPENAI_API_KEY and OPENAI_MODEL.
- Cloudflare R2 uploads and responsive image delivery; uploads are optimized and web images request appropriate sizes.
- Unlimited property image count (individual file validation remains).
- New-property email notifications use unique emails known to the system and verified subscribers.
- Owner ledger, maintenance/service item costing, apartment/tenancy workflow, visit assignment, audit logs and role access foundation.

## Existing databases
For databases already created before this build, use the migration SQL in:

`mysql/migrations/2026-08-22-nida-rwanda-customer.sql`

Do not run that migration if those columns already exist; your existing database may already have them from the manual ALTER commands.

## Important environment values
See `.env.mysql.example`.
