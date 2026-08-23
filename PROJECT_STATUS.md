# NOVAWORKS MySQL Build Status

This package is the MySQL-based NOVAWORKS build.

Implemented foundations include MySQL authentication/data access, role-aware dashboards, Reception returning-customer workflow, NIDA verification, email OTP, customer stay/extension handling, QR customer pass, strong-password and IT password-reset workflow, Cloudflare R2 media, portfolio editing, SMS device/relay integration and health checking, feature flags, visit assignment/audit, service-request item costing, owner ledger reporting, and NOVA live-context support.

## Verification performed before packaging

- No active Supabase/PostgreSQL application imports or package dependencies found.
- TypeScript source passed a syntax-only parse check with no syntax diagnostics.
- `scripts/install-novaworks.sh` passed `bash -n`.
- `scripts/create-it-user.mjs` passed `node --check`.
- Required MySQL/NIDA/SMS/NOVA/Reception/password-reset/accounting files are present.

A full `npm install && npm run build` could not be executed in the packaging sandbox because external npm registry downloads are unavailable there. The Ubuntu installer performs dependency installation and a production build on the target server and stops on any build error (`set -euo pipefail`).
