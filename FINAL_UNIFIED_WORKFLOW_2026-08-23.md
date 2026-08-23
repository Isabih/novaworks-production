# NOVAWORKS unified workflow update — 2026-08-23

Implemented in this build:
- Available apartment/unit cards on property details with direct Book Apartment action and booking preselection.
- IT-only Users & Subscribers management with role filtering, email hold/resume and subscriber deletion.
- Animated Home Tour for Rent / Buy / Sell / List Property, ending in newsletter subscription.
- Luxury classification corrected: Villa is no longer automatically luxury; only `is_luxury=1` or `luxury-apartment` triggers the gate.
- Luxury email verification now notifies IT/Admin after OTP verification. Approval emails unlock access and link to the requested property; decline emails provide contact details.
- Confirmed bookings email the related property owner with client, apartment, stay and amount details.
- Service requests email only the related property owner; customer status emails include the staff response/timing when supplied.
- Mail inbox uses one open thread per external email, unread counters, unread-first ordering and red unread indicators.
- Bulk property alerts respect the IT email hold flag for registered users.

## Required migration
Run before starting this build:

`mysql -u novaworks -p novaworks < mysql/migrations/2026-08-23-tour-subscribers-mail-booking.sql`

Then clear Vite caches and start normally.
