
---

# `docs/04-ticket-flow.md`

```md
# Ticket Flow

## Purpose

The ticket flow controls how users claim, view, and use tickets for events.

The MVP must support:

- ticket creation for logged-in users
- one ticket per user per event
- event-specific ticket limits
- sold-out states
- duplicate ticket prevention
- QR token creation
- ticket display in the client dashboard

The ticket flow must be simple, secure, and reliable.

## Main Business Rule

A user can have only one ticket per event.

This must be enforced both in application logic and in the database.

Required database constraint:

```text
unique(event_id, user_id)