# Database Schema

## profiles

Stores user profile and role data.

Fields:

- id
- full_name
- email
- role
- created_at
- updated_at

Rules:

- id references the auth user ID.
- role is client by default.
- valid roles are client, event_organizer, event_staff, admin.
- only admins should change roles.

## events

Stores event data.

Fields:

- id
- title
- description
- location
- starts_at
- ends_at
- status
- max_tickets
- max_guest_list
- organizer_id
- created_at
- updated_at

Rules:

- organizer_id references profiles.id.
- one organizer can own many events.
- status can be draft, published, active, completed, or cancelled.
- max_tickets is defined per event.
- max_guest_list is defined per event.

## event_staff_assignments

Connects staff users to specific events.

Fields:

- id
- event_id
- staff_user_id
- assigned_by
- created_at

Rules:

- event_id references events.id.
- staff_user_id references profiles.id.
- assigned_by references profiles.id.
- event_staff users can validate tickets only for assigned events.
- admins can validate tickets for all events.

## tickets

Stores tickets and QR data.

Fields:

- id
- event_id
- user_id
- ticket_code
- qr_token
- status
- created_at
- used_at
- used_by

Rules:

- event_id references events.id.
- user_id references profiles.id.
- used_by references profiles.id.
- ticket_code must be unique.
- qr_token must be unique.
- each user can have only one ticket per event.
- status can be active, used, cancelled, expired, or invalid.
- used_at is null until successful check-in.
- used_by is null until successful check-in.

Important constraints:

- unique(event_id, user_id)
- unique(ticket_code)
- unique(qr_token)

## check_ins

Stores all ticket validation attempts.

Fields:

- id
- ticket_id
- event_id
- checked_by
- result
- message
- checked_at

Rules:

- ticket_id references tickets.id when a ticket is found.
- event_id references events.id.
- checked_by references profiles.id.
- result can be success, already_used, invalid_ticket, wrong_event, unauthorized, or error.
- every scan attempt should create a check-in record.
- successful scans also update the ticket status to used.