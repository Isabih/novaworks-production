# NOVAWORKS Final Workflow Release — 2026-08-23

This release consolidates the latest NOVAWORKS workflow changes on top of the working MySQL-browser-leak fix.

## Included

- Constant role-based sidebars for IT, Admin, Receptionist, Owner, Agent and Customer.
- Admin property creation/management and Reports & Export.
- Admin user list hides IT accounts; IT can see Admin accounts.
- Reception dashboard separated from Register Customer.
- Owner dashboard limited to owned-property bookings, service requests and property/money-flow reports.
- Customer booking/extension flow, remaining-stay countdown, service request catalog and contact information.
- Buildings with optional units; standalone apartments/offices/studios remain supported.
- Unit codes, floor/bed/bath/area/price/status and optional apartment images.
- Public building/unit availability that excludes occupied, reserved and pending/confirmed-booked units.
- Unit-specific visit requests.
- Owner notifications for confirmed clients and service requests.
- Customer progress emails for booking/service workflows.
- One open inbox conversation per external email, with unread tracking.
- Guided Tour updated for property/unit booking, payments, customer workflows and Luxury Access.
- MySQL runtime import remains server-only to prevent mysql2 from entering the browser bundle.

## Existing database upgrade

Run once:

```bash
mysql -u novaworks -p novaworks < mysql/migrations/2026-08-23-property-owner-customer-workflow.sql
```

The migration is idempotent for the newly introduced columns/tables and normalizes the service-request category/priority enums for existing installations.

## Development start

Keep your real `.env` from your current installation; it is intentionally not included in this ZIP.

```bash
npm install
rm -rf node_modules/.vite node_modules/.cache .tanstack .output dist
npm run dev -- --force
```

## Production verification

```bash
bash scripts/final-check.sh
```

Then deploy and run your normal production process.
