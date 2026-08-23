# NOVAWORKS customer booking + guided tour update

- Artistic glass/transparent guided tour with goal-specific steps.
- Tour subscription ends with animated thank-you and automatic return Home.
- Property details now shows a prominent Book Apartment button beside Inquire.
- Booking opens on the property page; it does not send an authenticated customer to the dashboard.
- Visitors without an account are sent to Auth and returned to the same property after email verification/sign-in; the booking form auto-opens.
- Auth self-registration remains forced to the customer role.
- Customer booking requires a verified account.
- Until payment is complete and Reception confirms the booking, customer dashboard access is restricted to Book & Pay only.
- Book & Pay shows only available apartments. Existing occupied/reserved units remain excluded by the available_apartments view.
- After Reception confirmation, normal customer dashboard functionality becomes available.
- Includes the Vite/MySQL browser-leak-safe mysql.server implementation.
