# Password security module — staging rollout

This work is isolated to `feature/password-security-approval`. Do not deploy before review.

## Required configuration
- `RESEND_API_KEY`: working email provider credentials (not the dev-mail-disabled fallback).
- `RESEND_FROM`: verified sender.
- `NOVAWORKS_IT_ALERT_EMAILS`: comma-separated monitored IT recipients.
- `NOVAWORKS_SECURITY_SECRET`: random, private 32+ character HMAC secret, consistent across server instances.
- `SITE_URL`: public HTTPS application origin, used for completion links.

## Database
Back up the staging database, then apply `mysql/migrations/2026-11-18-password-security.sql`.
The migration creates a separate `password_security_requests` table and does not alter legacy password-reset rows.

## Functional sequence
1. Normal change: authenticated user verifies current password and provides a reason.
2. Forgotten password: user requests recovery with account email and reason (generic public response).
3. The user receives a 5-minute email OTP. IT receives a request notification.
4. User verifies OTP; IT receives a review-ready notification.
5. An independent IT approver enters a mandatory reason and approves or rejects.
6. Approval sends a 15-minute one-time completion link to the verified account email.
7. User sets a new password. Existing sessions are revoked, request is completed, and audit is written transactionally.

## Known release blockers / follow-up hardening
- Run `node --test tests/password-security-stage*.test.mjs`, `pnpm lint`, `pnpm build`, and staging MySQL integration tests. Source-level checks are not substitutes.
- Add a durable transactional notification outbox with retry and delivery tracking. Current email sends happen after the request transaction; failures can leave a request waiting for notification.
- Add request/IP/email rate limiting across app instances and periodic expiry/cleanup.
- Audit all remaining password mutation paths (staff provisioning, forced password changes, administrative operations) before claiming global enforcement.
- Verify and upgrade the existing generic `/api/auth/otp` endpoint; it is not the new password-security OTP path.
- Add end-to-end tests for OTP replay, concurrent approvals, token reuse, self-approval, missing configuration, and session revocation.
- Confirm the IT dashboard and normal change flow under real authenticated sessions.
- Review login/session token storage and CSRF protections.
- Never commit the security secret or actual email credentials.
