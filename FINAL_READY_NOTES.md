# NOVAWORKS final ready notes — 2026-08-23

This package consolidates the current MySQL, Resend, R2, NIDA, SMS, NOVA and dashboard work.

## Important database upgrade for an existing database

Run once:

```bash
mysql -u novaworks -p novaworks < mysql/migrations/2026-08-23-mail-inbound-final.sql
```

Fresh installs using `mysql/schema.sql` already include these columns.

## Resend inbound mail

Configure the Resend webhook for event `email.received` to:

`https://novaworks.rw/api/mail/inbound`

Required environment variables:

- `RESEND_API_KEY`
- `RESEND_FROM` (quote this value in .env)
- `RESEND_REPLY_TO`
- `RESEND_INBOUND_ADDRESS`
- `RESEND_WEBHOOK_SECRET` (`whsec_...` from the exact webhook)

The route verifies Resend/Svix signatures, retrieves the full received email, accepts any mailbox on the configured receiving domain, stores the message in `communication_threads` / `communication_messages`, avoids duplicate inserts when a webhook is replayed, and creates staff notifications for IT, Admin and Receptionist.

## Runtime

Use Node.js 22 LTS.
