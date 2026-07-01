# Ticket Flow

## Purpose

The ticket flow controls how users claim, view, and use tickets for events.

The MVP must support:

- ticket creation for logged-in users
- one ticket per user per event
- event-specific ticket limits
- sold-out states
- duplicate ticket prevention
- ticket code generation
- QR token generation
- ticket display in the client dashboard

The ticket flow must be simple, secure, and reliable.

## Main Business Rule

A user can have only one ticket per event.

This must be enforced in both application logic and the database.

Required database constraint:

- unique(event_id, user_id)

## Ticket Creation Entry Point

A user starts the ticket flow from an event page.

Example route:

- /events/[eventId]

The event page should show a button such as:

- Claim Ticket
- Get Ticket

## Ticket Creation Flow

When a user clicks to claim a ticket:

1. Check whether the user is authenticated.
2. If the user is not authenticated, redirect to login or signup.
3. Preserve the selected event ID during the redirect.
4. After login or signup, continue the ticket creation flow.
5. Check whether the event exists.
6. Check whether the event status allows ticket creation.
7. Check whether the user already has a ticket for this event.
8. Check whether the event still has available ticket capacity.
9. If the user already has a ticket, show the existing ticket.
10. If the event is full, show a sold-out message.
11. If all checks pass, create a ticket.
12. Generate a unique ticket code.
13. Generate a unique QR token.
14. Save the ticket.
15. Show the ticket and QR code to the user.

## Unauthenticated User Flow

If a non-logged-in user tries to claim a ticket:

1. Redirect to /login.
2. Keep track of the requested event.
3. After successful login, continue the ticket claim flow.
4. If the user does not have an account, allow signup.
5. After signup, continue the ticket claim flow.

The app should not lose the selected event during authentication.

Possible redirect pattern:

- /login?next=/events/[eventId]&claimTicket=true

The exact implementation can be chosen after analyzing the current codebase.

## Event Status Check

Tickets should only be created for valid events.

Allowed statuses for ticket creation:

- published
- active

Tickets should not be created for events with these statuses:

- draft
- completed
- cancelled

## Capacity Check

Each event has its own ticket limit.

Relevant event field:

- max_tickets

Before creating a ticket, count how many active or used tickets already exist for the event.

If the number is equal to or greater than max_tickets, the event is sold out.

Sold-out behavior:

- do not create a ticket
- do not generate a QR code
- show a clear sold-out message

## Duplicate Ticket Check

Before creating a ticket, check whether the user already has a ticket for the selected event.

If the user already has a ticket:

- do not create another ticket
- show the existing ticket
- show the existing QR code

This prevents accidental duplicate tickets.

## Ticket Data

The tickets table should include:

- id
- event_id
- user_id
- ticket_code
- qr_token
- status
- created_at
- used_at
- used_by

## Ticket Status Values

Valid ticket statuses:

- active
- used
- cancelled
- expired
- invalid

## Ticket Status Meaning

### active

The ticket was created and can still be validated.

### used

The ticket has already been validated at the entrance.

### cancelled

The ticket was cancelled and cannot be used.

### expired

The ticket is no longer valid because the event has ended or the ticket expired.

### invalid

The ticket is marked as invalid because of an error, fraud, or manual administrative action.

## Ticket Code

The ticket code is a human-readable code that can be manually entered by staff.

The ticket code must be unique.

Required database constraint:

- unique(ticket_code)

The ticket code should not be easily predictable.

## QR Token

The QR token is a secure unique token used for QR code validation.

The QR token must be unique.

Required database constraint:

- unique(qr_token)

The QR token should not be based only on predictable values such as:

- user ID
- event ID
- email
- sequential ticket number

The QR token should be generated securely.

## QR Payload

The QR code should contain a value that allows the server to identify the ticket.

Recommended simple MVP payload:

- qr_token

The frontend displays this token as a QR code.

The server uses this token to find and validate the ticket.

The QR code itself must not decide whether the ticket is valid.

## Ticket Display

After ticket creation, the user should see:

- event title
- event date
- event location
- ticket code
- QR code
- ticket status

The ticket should be visible in:

- /dashboard

Optionally, the ticket can also be visible in:

- /tickets/[ticketId]

## Client Dashboard Ticket States

The client dashboard should support these states.

### No tickets

Show:

- You do not have any tickets yet.

Optionally show public events.

### Has active ticket

Show:

- event information
- ticket code
- QR code
- ticket status

### Has used ticket

Show the ticket as already used.

### Has cancelled or expired ticket

Show the ticket as unavailable.

## Server-Side Rules

Ticket creation must happen server-side.

The client cannot directly decide:

- whether the event has capacity
- whether the user already has a ticket
- whether the ticket is valid
- what role the user has
- what user ID the ticket belongs to

The server must use the authenticated user ID.

The client must not be able to create a ticket for another user.

## Recommended Server Action Behavior

The ticket creation logic should receive:

- event_id

The server should read:

- authenticated user ID
- user profile
- event data
- existing ticket data
- current ticket count

The server should return a structured result.

Possible result values:

- success
- already_has_ticket
- sold_out
- event_not_found
- event_not_available
- unauthorized
- error

## Errors and User Messages

### Success

Message:

- Ticket created successfully.

### Existing Ticket

Message:

- You already have a ticket for this event.

### Sold Out

Message:

- This event is sold out.

### Event Not Found

Message:

- Event not found.

### Event Not Available

Message:

- Tickets are not available for this event.

### Not Logged In

Message:

- Please log in to claim your ticket.

### Server Error

Message:

- Something went wrong while creating your ticket.

## MVP Acceptance Criteria

The ticket flow is correct when:

- unauthenticated users are redirected to login or signup before ticket creation
- logged-in clients can create tickets
- users cannot create more than one ticket for the same event
- event capacity is respected
- sold-out events block new tickets
- each ticket receives a unique ticket code
- each ticket receives a unique QR token
- users can see their tickets in the client dashboard
- users cannot create tickets for other users
- ticket creation is handled server-side
