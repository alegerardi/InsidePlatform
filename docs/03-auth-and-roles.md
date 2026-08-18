# Authentication and Roles

## Implemented authentication

Supabase Auth provides signup, login, logout, session handling, and the auth callback. A database trigger creates a `profiles` row for each new auth user with role `client`.

Authentication establishes identity. Authorization determines which data and operations that identity can access. Sensitive authorization must be enforced on the server and in Supabase RLS/RPC logic, never only in the browser.

## Implemented roles

### `client`

Clients can:

- View public event pages.
- Claim one ticket per event under the current non-payment flow.
- View their own tickets and QR codes.
- Use the client dashboard.

Clients cannot view unrelated tickets, validate entry, manage events, or change roles.

### `event_organizer`

Organizers can:

- Create and manage their own events and ticket types.
- View their own event groups and statistics.
- Assign and remove staff for their events.
- Cancel an eligible event under the current no-revenue rule.

Organizers cannot manage another organizer's events, assign platform roles, or validate tickets unless separately authorized through a supported role model.

### `event_staff`

Staff can:

- View assigned events in the staff dashboard.
- Open `/staff/events/[eventId]/validate` for an assigned event.
- Scan QR tokens or enter ticket codes manually.
- Trigger server-side validation only for assigned events.

Staff cannot create events, access unrelated private data, validate other events, or change roles.

### `admin`

The admin role has broad database authorization and can use the shared dashboard, create events, and access protected data where current pages/actions support it.

The current `AdminDashboard` is a placeholder. A complete interface for global users, events, tickets, check-ins, statistics, roles, payments, and operational actions is not implemented. Documentation must not imply that database authority automatically means every admin UI exists.

Admins are rare and manually assigned during the MVP.

## Role-aware dashboard

`/dashboard` authenticates the user, loads the profile, and renders one module through the shared dashboard shell:

- `ClientDashboard`
- `OrganizerDashboard`
- `StaffDashboard`
- `AdminDashboard`

This is one role-aware dashboard architecture, not four independent systems.

## Current route access

Public routes include:

- `/`
- `/login`
- `/signup`
- `/events/[slug]`

Authenticated routes include:

- `/dashboard`
- `/tickets/[ticketId]`
- Organizer-owned `/events/new`, `/events/[slug]/edit`, and `/events/[slug]/stats` flows.
- Assigned-staff `/staff/events/[eventId]/validate` flows.

Internal/state-changing routes include:

- `/auth/callback`
- POST `/staff/events/[eventId]/scan`

`/validate/[qrToken]` is a safe informational route. Opening it does not validate or consume a ticket.

## Server-side authorization principles

- Use the authenticated user ID; never accept an acting user ID from the browser.
- Read roles and ownership from the database.
- Clients access only their own private ticket data.
- Organizers manage only their own events.
- Staff validate only assigned events.
- Admin behavior still requires explicit server-side checks.
- Unauthenticated users are redirected to login with a sanitized return path where applicable.
- Unauthorized authenticated page access redirects to `/unauthorized` or returns a safe authorization error.
- Secret and service-role keys never enter client bundles.

## Planned — approved payment permissions

### Client

For a paid ticket, a client will be allowed to:

- Purchase exactly one ticket for themselves per event.
- Create a pending order and temporary reservation through an authenticated server operation.
- Open provider checkout for that order.
- View only their own order and payment status.

A client cannot mark an order paid, choose financial snapshots, change fees, or issue a ticket. Only verified provider events drive payment confirmation.

### Organizer

An organizer will be allowed to:

- Start provider-hosted merchant onboarding.
- View their onboarding, payment, and payout capability status.
- Create drafts before onboarding completes.
- Run free events without payment onboarding.
- Publish paid ticket types only when payments and payouts are enabled.
- View financial information for their own events and orders.

An organizer cannot edit the event platform fee or fee payer, alter immutable financial snapshots, or normally cancel an event after a successful paid order.

### Admin

The exclusive planned admin payment interface will allow authorized admins to:

- Configure an event's platform fee in basis points.
- Choose `customer` or `organizer` as fee payer.
- Edit these settings only before the first successful paid order.
- See the order and timestamp that locked the configuration.
- Review orders, provider costs, organizer proceeds, platform net, webhook state, and disputes.
- Perform documented exceptional operations for paid-event cancellation and disputes.

Exceptional actions require stronger audit records and must not silently rewrite payment history.

## Organizer payment eligibility

Paid ticket publication requires a provider-neutral merchant-account state equivalent to:

```text
onboarding_status = complete
payments_enabled = true
payouts_enabled = true
```

Stripe-hosted Connect onboarding is the first implementation. Inside Platform stores provider account references and status, not identity documents or bank credentials.

## Terms and evidence

Before paid checkout, the authenticated client must receive the organizer identity, nominal ticket price, `+ fees` disclosure, exact checkout breakdown, no-refund policy subject to law, event-cancellation policy, privacy notice, and applicable terms.

The order must record the accepted terms version, acceptance timestamp, and proportionate request evidence. Evidence access is restricted and follows a retention policy.
