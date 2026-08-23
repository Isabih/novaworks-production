# Novaworks MySQL architecture

This build uses MySQL 8 as the application database and self-hosted token/session authentication. Application source code no longer depends on Supabase or PostgreSQL.

## Main data areas

The schema in `mysql/schema.sql` includes users and roles, properties/buildings, apartments/units, customers, tenancies, payments, visit requests, service requests and priced service items, owner ledger entries, notifications, audit logs, feature flags, password-reset requests, stay-extension requests, portfolio content and CMS content.

## Deployment

1. Copy `.env.mysql.example` to `.env.production` and fill NIDA, SMS, R2, Resend, AI and payment credentials.
2. Run `sudo bash scripts/install-novaworks.sh` from the project root on Ubuntu.
3. Sign in with the initial IT account printed by the installer and change the temporary password.
4. Test NIDA, SMS, Resend and R2 from System Health before production use.

## MySQL safety

Availability and rental assignment are checked server-side. Unit assignment is designed around current tenancy dates, and financial reports use ledger entries instead of mutating a single owner balance. Keep database backups and test restores before production migration.
