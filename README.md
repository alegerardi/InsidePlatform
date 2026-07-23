# Inside Platform

Inside Platform is a lightweight event ticketing and access-control MVP built with Next.js and Supabase.

The current product focuses on event creation, public event pages, ticket claiming, guest-list management, QR-based entrance validation, staff access control, and organizer statistics.

It is designed as an early-stage alternative to event platforms such as Xceed, with the first MVP focused on controlled event operations before adding online payments.

## Current MVP Scope

Implemented:

- Supabase authentication
- Role-based access:
  - `client`
  - `event_organizer`
  - `event_staff`
  - `admin`
- Organizer dashboard
- Public event pages by slug
- Event creation with ticket types
- Atomic event creation through a Supabase RPC
- Event editing for upcoming events
- Soft event cancellation
- Paid ticket capacity
- Guest-list capacity
- Ticket types with capacity pools:
  - `paid`
  - `guest_list`
- Ticket claiming
- One ticket per user per event
- Ticket QR page
- Staff validation page
- Event-specific POST-based QR validation
- Manual ticket-code validation
- Staff assignment and removal
- Organizer statistics
- Raw public page-view stats
- Audit logs through `app_action_logs`
- Supabase generated TypeScript database types
- Integration tests for important database/security rules
- GitHub Actions CI for lint, build, and tests

Not implemented yet:

- Online payments
- Stripe integration
- Refunds
- Organizer payouts
- Promoter tracking
- Email delivery workflows
- Advanced analytics
- Production-grade rate limiting
- Production monitoring
- Admin master delete panel

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Supabase RPC functions
- Vitest
- GitHub Actions

## Main Routes

Public:

- `/`
- `/login`
- `/signup`
- `/events/[slug]`

Authenticated:

- `/dashboard`
- `/events/new`
- `/events/[slug]/edit`
- `/events/[slug]/stats`
- `/tickets/[ticketId]`
- `/staff/events/[eventId]/validate`

Internal/API:

- `/auth/callback`
- `/staff/events/[eventId]/scan`

Legacy/safe route:

- `/validate/[qrToken]`

The legacy validation route must not perform ticket validation through GET requests. Real validation is handled through the event-specific staff scanner POST flow.

## Project Structure

```text
app/
  auth/
  dashboard/
  events/
  login/
  signup/
  staff/
  tickets/
  validate/

components/
  auth/
  dashboard/
  events/
  layout/
  staff/
  tickets/

lib/
  actions/
  auth/
  events/
  staff/
  supabase/
  tickets/
  url/

supabase/
  migrations/

tests/
  integration/