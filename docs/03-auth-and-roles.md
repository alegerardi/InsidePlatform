# Authentication and Roles

## Purpose

The platform uses authentication and role-based authorization to control what each user can see and do.

The MVP must support:

- user signup
- user login
- user logout
- profile creation
- default client role
- manually assigned elevated roles
- role-dependent dashboards
- protected routes
- server-side authorization checks

Authentication identifies who the user is.

Authorization decides what the user is allowed to do.

## User Roles

The MVP has four roles:

- client
- event_organizer
- event_staff
- admin

## Role Definitions

### client

Default role for all new users.

A client can:

- create a ticket for an event
- view their own tickets
- view their own QR codes
- access the client dashboard

A client cannot:

- access organizer dashboards
- access staff authentication pages
- validate tickets
- view other users' tickets
- view event statistics
- change their own role

### event_organizer

An event organizer can manage their own events.

An event organizer can:

- create events
- view events they own
- view statistics for their own events
- see ticket counts for their own events
- see check-in counts for their own events
- assign staff to their own events, if this feature is implemented in the current phase

An event organizer cannot:

- view events owned by other organizers
- validate tickets unless also assigned as event_staff or admin
- access global admin statistics
- change platform-level user roles

### event_staff

Event staff are responsible for validating tickets at the entrance.

Event staff can:

- access the staff dashboard
- access the `/authenticate` page
- validate tickets for assigned events
- manually enter ticket codes
- scan QR codes
- create check-in records through ticket validation

Event staff cannot:

- create events
- view global statistics
- validate tickets for events they are not assigned to
- view private client data unrelated to ticket validation
- change user roles

### admin

Admin is the highest permission level.

An admin can:

- access all dashboards and data
- view all users
- view all events
- view all tickets
- view all check-ins
- validate tickets for any event
- change user roles manually
- access global statistics

Admins should be rare and manually assigned.

## Default Signup Behavior

When a new user signs up:

1. A new authentication user is created.
2. A profile row is created.
3. The profile role is set to `client` by default.

Default profile role:

```text
client