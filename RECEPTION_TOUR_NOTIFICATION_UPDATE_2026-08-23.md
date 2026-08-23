# NOVAWORKS Reception / Tour / Notification Update

This build adds:

- Luxury Access procedure to the public guided Tour.
- Property booking button now redirects non-customer sessions to customer authentication instead of showing an alert.
- Home hero filters are real controls and pass listing type, category, location, price and keyword to the Properties page.
- Reception dashboard is separated from Register Customer.
- New route: `/dashboard/receptionist/register`.
- Reception sidebar is fixed and contains Dashboard, Register Customer, Notifications, Mail & Messages, Bookings & Payments and Service Requests. No Properties item is shown for Reception.
- Shared Service Requests page now uses the authenticated role's standard sidebar instead of creating a special page-specific sidebar.
- New-notification popup polling every 15 seconds. Booking and incoming-mail notifications are included for Reception.
- Opening a notification records an audit log. The first staff member to open a shared notification reference is recorded with `NOTIFICATION_OPENED_FIRST`; subsequent opens are recorded with `NOTIFICATION_OPENED` and include the destination/action.

No database schema migration is required for these changes; the existing `audit_logs` and `staff_notifications` tables are used.
