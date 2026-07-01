# MVP Outline

## 1. Project Vision

The project is a lightweight event ticket, guest-list, and access-control platform inspired by Xceed.

The MVP focuses on:

* authentication
* role-based dashboards
* event creation by organizer users
* ticket creation for logged-in clients
* QR code generation
* QR code authentication/check-in by staff
* basic statistics

The MVP does not include payments, organization accounts, promoter systems, email automation, or advanced analytics.

## 2. User Roles

The platform has four roles:

* client
* event_organizer
* event_staff
* admin

New users are clients by default.

Other roles are manually assigned in the database.

## 3. Main Routes

The MVP should include:

* `/`
* `/signup`
* `/login`
* `/dashboard`
* `/events/[eventId]`
* `/tickets/[ticketId]`
* `/authenticate`
* `/unauthorized`

## 4. Dashboard Modules

The `/dashboard` route should render one of these modules depending on user role:

* ClientDashboard
* OrganizerDashboard
* StaffDashboard
* AdminDashboard

## 5. Event Ownership

Events belong directly to organizer users.

The MVP does not use organization-level tables.

One organizer can own many events.

## 6. Ticket Creation

Tickets are created only for logged-in users.

A user can have only one ticket per event.

If the user already has a ticket, show the existing ticket.

If the event is full, show a sold-out message.

If the user is eligible, create the ticket and generate a unique QR token.

## 7. QR Code Generation

Each ticket has a unique QR token.

The QR code is generated from the QR token.

The QR code is displayed to the client.

Ticket validation must happen server-side.

## 8. QR Authentication

Event staff and admins can validate tickets through `/authenticate`.

Validation checks:

* ticket exists
* ticket belongs to the selected event
* ticket is active
* ticket was not already used
* staff is authorized for the event

Every validation attempt is saved in `check_ins`.

## 9. Database Tables

The MVP uses:

* profiles
* events
* event_staff_assignments
* tickets
* check_ins

## 10. Future Features

Future versions may include:

* organization-level accounts
* paid tickets
* Stripe
* ticket types
* promoter tracking
* email confirmation
* advanced analytics
* public event discovery
