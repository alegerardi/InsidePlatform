≈≈≈≈
<!-- BEGIN:nextjs-agent-rules -->
# AGENTS.md

## Project Overview

This is a Next.js App Router application for a role-based event ticket and QR authentication platform.

The MVP focuses on:

* user authentication
* role-based authorization
* modular role-dependent dashboards
* event management by organizer users
* ticket creation for clients
* QR code generation for tickets
* QR code authentication/check-in by event staff
* basic organizer statistics
* basic admin statistics

The MVP does not include:

* online payments
* Stripe
* organization-level accounts
* promoter tracking
* email automation
* advanced analytics

## Tech Stack

* Next.js App Router
* TypeScript
* Tailwind CSS
* Supabase Auth
* Supabase Postgres
* Supabase Row Level Security

## User Roles

The platform has four roles:

* client
* event_organizer
* event_staff
* admin

New users are clients by default.

Other roles are manually assigned in the database during the MVP phase.

## Core Database Tables

Use these MVP tables:

* profiles
* events
* event_staff_assignments
* tickets
* check_ins

Do not create organization-level tables yet.

## Core Business Rules

* One organizer user can own many events.
* One client can have only one ticket per event.
* Tickets are created only for logged-in users.
* If a user is not logged in, redirect to login/signup before ticket creation.
* If the user already has a ticket for the event, show the existing ticket instead of creating a duplicate.
* Each event has its own max_tickets and max_guest_list.
* Each ticket has a unique ticket_code and qr_token.
* QR validation must happen server-side.
* Every validation attempt should be stored in check_ins.
* Event staff can validate only tickets for events they are assigned to.
* Admins can access all events and statistics.

## Dashboard Architecture

The `/dashboard` route should render different modules depending on the user role:

* ClientDashboard
* OrganizerDashboard
* StaffDashboard
* AdminDashboard

Do not create four unrelated dashboard systems.

Use a role-aware dashboard container.

## Coding Rules

* Use TypeScript.
* Keep code simple and readable.
* Do not modify unrelated files.
* Do not introduce payments, organizations, promoters, or email automation unless explicitly requested.
* Do not expose secret keys on the client side.
* Do not rely only on frontend authorization.
* Prefer server-side checks for sensitive operations.
* Prefer reusable services/actions for ticket creation and validation logic.
* Before changing architecture, explain the reason and wait for approval.

## Before Coding

For medium or large tasks:

1. Read this file.
2. Read the relevant files in `/docs`.
3. Inspect the existing codebase.
4. Create an implementation plan.
5. Wait for approval before editing files.

## After Coding

Run:

```bash
npm run lint
npm run build
```

Then explain:

* what changed
* which files changed
* any security risks
* any remaining TODOs
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
≈
