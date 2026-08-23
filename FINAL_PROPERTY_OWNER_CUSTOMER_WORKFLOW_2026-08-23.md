# NOVAWORKS — Property / Owner / Customer Workflow Update

## Database migration
Run once on the existing `novaworks` MySQL database:

```bash
mysql -u novaworks -p novaworks < mysql/migrations/2026-08-23-property-owner-customer-workflow.sql
```

The migration is idempotent for the added columns/tables and also consolidates historical duplicate open mail threads so one external email address has one current inbox conversation.

## Admin / IT
- Admin and IT retain a constant sidebar on Reception pages.
- Admin can add/manage properties and units.
- Admin user list hides IT accounts; IT can see Admin accounts.
- Reports & Export provides date/property filters, booking export and money-flow export.
- Service Catalog lets Admin/IT maintain customer-selectable services and default priorities.
- Existing properties have a Manage Units action. Units can be apartment, office, studio or other, with code, floor, dimensions, pricing, status and optional R2 images.

## Owner
- No internal Mail & Messages workspace.
- My Bookings contains bookings only for the owner's properties.
- Service Requests contains requests only for the owner's properties.
- Property Report shows gross rent, commission, maintenance deductions and net profit, with CSV export.
- Owner continues to receive external email when a client is confirmed or a service request is created for the owner's property.

## Customer
- Before first confirmed paid/waived booking, only Book & Pay is permitted under `/dashboard`.
- After Reception confirmation, the normal customer dashboard unlocks.
- Dashboard shows active stay and remaining-day countdown plus NOVAWORKS contact details.
- Bookings & Extensions supports another property or a paid extension of the current stay. Extension days are applied only after payment and Reception confirmation.
- Service Requests uses the Admin/IT service catalog, supports Other/custom requests and priority levels, and displays status/expected action time.
- Customer receives email during booking/service progress and can reply to the NOVAWORKS reply-to address.

## Property / unit model
- A building may contain zero or many units.
- Apartment / office / studio units may be managed independently under a parent property/building.
- Standalone apartment/office/studio properties can use a single unit record.
- `available_apartments` excludes occupied/reserved tenancies and pending/confirmed bookings.
- Public property cards expose unit availability counts.
- Property detail shows available exact units and optional unit images.
- If unit images are missing, the site explicitly offers a scheduled visit instead of displaying a broken image.
- Visit requests may target a specific unit code, and that unit is included in staff/customer visit information.

## Mail / notification workflow
- Open conversations are consolidated by external email address.
- Booking activity reuses the same open thread for that email where possible.
- Incoming unread mail remains prioritized in the inbox.
- Existing notification audit behavior records the first staff member who opens a shared reference and each subsequent opener/action.

## Tour
The Rent tour now explains building/standalone units, exact unit codes/images, verified customer accounts, payment + Reception confirmation, dashboard countdown/extension payment, service requests, and Luxury Access remains available as its own guided path.

## Run after replacing the project

```bash
pkill -f "vite" 2>/dev/null || true
rm -rf node_modules/.vite node_modules/.cache .tanstack .output dist
npm install
npm run dev -- --force
```

TanStack will regenerate `src/routeTree.gen.ts` when Vite starts, including the new Reports, Owner, Service Catalog and Unit Management routes.
